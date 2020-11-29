import fetch from 'node-fetch';
import { ConfigKeys, Product, Parameters } from './interfaces';
import keysJson from './config';
import MysqlModel from './models';
import Email, { sleep } from './utils';
import { TIMEOUT, SLEEPTIME } from './constants';

const makeNeedNumRebate = (HTMLText: string) => {
  const NEEDNUM_REBATE_ALL_REGEX = /\\"needNum\\":\\"([0-9]+)\\"([^"]*)\\"rebate\\":\\"([0-9.]+)\\"/g;
  const needNumRebateAllResult = HTMLText.match(NEEDNUM_REBATE_ALL_REGEX);
  if (needNumRebateAllResult === null) throw new Error('needNum rebate not match');

  const NEEDNUM_REBATE_REGEX = /\\"needNum\\":\\"([0-9]+)\\"([^"]*)\\"rebate\\":\\"([0-9.]+)\\"/;
  const matchNeedNumRebate = (item: string) => {
    const needNumRebateResult = item.match(NEEDNUM_REBATE_REGEX);
    if (needNumRebateResult === null) throw new Error('needNum rebate not match');
    return {
      needNum: parseInt(needNumRebateResult[1], 10),
      rebate: parseFloat(needNumRebateResult[3]),
    };
  };
  return needNumRebateAllResult.map(matchNeedNumRebate);
};

const makeNeedMoneyRewardMoney = (HTMLText: string) => {
  const NEEDMONEY_REWARDMONEY_ALL_REGEX = /\\"needMoney\\":\\"([0-9.]+)\\"([^"]*)\\"rewardMoney\\":\\"([0-9.]+)\\"/g;
  const needMoneyRewardMoneyAllResult = HTMLText.match(NEEDMONEY_REWARDMONEY_ALL_REGEX);
  if (needMoneyRewardMoneyAllResult === null) throw new Error('needMoney rewardMoney not match');

  const NEEDMONEY_REWARDMONEY_REGEX = /\\"needMoney\\":\\"([0-9.]+)\\"([^"]*)\\"rewardMoney\\":\\"([0-9.]+)\\"/;
  const matchNeedMoneyRewardMoney = (element: string) => {
    const needMoneyRewardMoneyResult = element.match(NEEDMONEY_REWARDMONEY_REGEX);
    if (needMoneyRewardMoneyResult === null) throw new Error('needMoney rewardMoney not match');
    return {
      needMoney: parseFloat(needMoneyRewardMoneyResult[1]),
      rewardMoney: parseFloat(needMoneyRewardMoneyResult[3]),
    };
  };
  return needMoneyRewardMoneyAllResult.map(matchNeedMoneyRewardMoney);
};

const matchQuotaDiscount = (productCouponText: string) => {
  const QUOTA_DISCOUNT_ALL_REGEX = /"quota":([0-9.]+)([^}]*)"discount":([0-9.]+)/g;
  const quotaDiscountAllResult = productCouponText.match(QUOTA_DISCOUNT_ALL_REGEX);
  if (quotaDiscountAllResult === null) throw new Error('quota discount not match');
  return quotaDiscountAllResult;
};

const makeQuotaDiscount = (quotaDiscountAllResult: RegExpMatchArray) => {
  const QUOTA_DISCOUNT_REGEX = /"quota":([0-9.]+)([^}]*)"discount":([0-9.]+)/;
  const matchQuotaDiscount = (element: string) => {
    const quotaDiscountResult = element.match(QUOTA_DISCOUNT_REGEX);
    if (quotaDiscountResult === null) throw new Error('quota discount not match');
    return {
      quota: parseFloat(quotaDiscountResult[1]),
      discount: parseFloat(quotaDiscountResult[3]),
    };
  };
  return quotaDiscountAllResult.map(matchQuotaDiscount);
};

class GoogPriceRemind {
  keys: ConfigKeys;

  public constructor(keys: ConfigKeys) {
    this.keys = keys;
  }

  private async getProducts() {
    const { sqlHost, sqlUser, sqlPasswd, sqlPort, sqlDbname } = this.keys;
    if (sqlHost && sqlUser && sqlPasswd && sqlPort && sqlDbname) {
      return await MysqlModel.getInstance().productsSelectQuery<Product>({
        attribute: [
          'product_id as id',
          'product_name as name',
          'product_price as price',
          'product_platform as platform',
        ],
        where: [
          {
            key: 'product_status',
            value: '1',
          },
        ],
      });
    } else {
      return (await import('./products')).default;
    }
  }

  private async getProductInfo(productID: number) {
    const url = `https://item.m.jd.com/product/${productID}.html`;
    const params = {
      method: 'get',
      timeout: TIMEOUT,
      gzip: true,
      headers: {
        Accept: '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7,vi;q=0.6',
        'Cache-Control': 'no-cache',
        'Accept-Encoding': 'gzip, deflate',
        Connection: 'keep-alive',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3514.2 Safari/537.36',
      },
    };
    return fetch(url, params).then((res) => res.text());
  }

  private async getProductCoupon(productID: number, cid: number, popId: number) {
    const url = `https://wq.jd.com/mjgj/fans/queryusegetcoupon?callback=getCouponListCBA&platform=3&cid=${cid}&popId=${popId}&sku=${productID}`;
    const params = {
      method: 'get',
      timeout: TIMEOUT,
      gzip: true,
      headers: {
        Accept: '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7,vi;q=0.6',
        'Cache-Control': 'no-cache',
        'Accept-Encoding': 'gzip, deflate',
        Connection: 'keep-alive',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3514.2 Safari/537.36',
      },
    };
    return await fetch(url, params).then((res) => res.text());
  }

  private async extractParametersOfHTML(HTMLText: string, productItem: Product) {
    const parameters: Parameters = {
      warestatus: -1,
      skuName: '',
      price: -1,
      tpp: -1,
      cid: -1,
      pingou: -1,
      popId: -1,
      needNumRebate: [],
      needMoneyRewardMoney: [],
      quotaDiscount: [],
    };

    const WARESTATUS_REGEX = `"warestatus":"([0-9.]+)"`;
    const warestatusResult = HTMLText.match(WARESTATUS_REGEX);
    if (warestatusResult === null || warestatusResult.length !== 2)
      throw new Error(`warestatus not match。Info：${JSON.stringify(productItem)}`);
    parameters.warestatus = parseInt(warestatusResult[1], 10);

    const SKUNAME_REGEX = `"skuName":"([^"]*)"`;
    const skuNameResult = HTMLText.match(SKUNAME_REGEX);
    if (skuNameResult === null || skuNameResult.length !== 2)
      throw new Error(`skuName not match。Info：${JSON.stringify(productItem)}`);
    parameters.skuName = skuNameResult[1];

    const PRICE_REGEX = `"p":"([0-9.]+)"`;
    const priceResult = HTMLText.match(PRICE_REGEX);
    if (priceResult === null || priceResult.length !== 2)
      throw new Error(`price not match。Info：${JSON.stringify(productItem)}`);
    parameters.price = parseFloat(priceResult[1]);

    const TPP_REGEX = `"tpp":"([^"]*)"`;
    const tppResult = HTMLText.match(TPP_REGEX);
    if (tppResult) {
      parameters.tpp = parseFloat(tppResult[1]);
    }

    const CID_REGEX = `"cg":"[0-9]+:[0-9]+:([0-9]+)"`;
    const cidResult = HTMLText.match(CID_REGEX);
    if (cidResult) {
      parameters.cid = parseFloat(cidResult[1]);
    }

    const PINGOU_REGEX = `"pingou":"([0-9]+)"`;
    const pingouResult = HTMLText.match(PINGOU_REGEX);
    if (pingouResult) {
      parameters.pingou = parseInt(pingouResult[1]);
    }

    const POPID_REGEX = `"vid":([0-9]+)`;
    const popIdResult = HTMLText.match(POPID_REGEX);
    if (popIdResult) {
      parameters.popId = parseFloat(popIdResult[1]);
    }

    // 满几件打几折 -start-
    try {
      parameters.needNumRebate = makeNeedNumRebate(HTMLText);
    } catch (error) {
      console.log();
      console.log(new Date());
      console.log(error.stack);
    }
    // 满几件打几折 -end-

    // 满减 -start-
    try {
      parameters.needMoneyRewardMoney = makeNeedMoneyRewardMoney(HTMLText);
    } catch (error) {
      console.log();
      console.log(new Date());
      console.log(error.stack);
    }
    // 满减 -end-

    // 优惠券 -start-
    if (parameters.cid !== -1 && parameters.popId !== -1) {
      const quotaDiscount = await this.getProductCoupon(
        productItem.id,
        parameters.cid,
        parameters.popId,
      )
        .then(matchQuotaDiscount)
        .then(makeQuotaDiscount)
        .catch((err) => {
          console.log();
          console.log(new Date());
          console.log(err.stack);
        });
      if (quotaDiscount) parameters.quotaDiscount = quotaDiscount;
    }
    // 优惠券 -end-
    return parameters;
  }

  /**
   * 价格是否合适
   * @param parameters
   * @param goodPrice
   */
  private isSuitablePrice(parameters: Parameters, goodPrice: number): [boolean, number, string] {
    let result = false; // 是否为好价
    let price = parameters.price; // 网上商品价格
    let type = '低价'; // 优惠类型

    // plus会员价 -start-
    if (parameters.tpp && parameters.tpp < parameters.price) {
      price = parameters.tpp;
      type = 'plus会员';
    }
    // plus会员价 -end-

    // 满几件打几折 -start-
    const { needNumRebate } = parameters;
    if (needNumRebate.length > 0) {
      for (let index = 0; index < needNumRebate.length; index++) {
        const element = needNumRebate[index];
        const discountPrice = (parameters.price * element.rebate) / 10;
        if (discountPrice < price) {
          price = discountPrice;
          type = `满${element.needNum}件打${element.rebate}折`;
        }
      }
    }
    // 满几件打几折 -end-

    // 满减 -start-
    const { needMoneyRewardMoney } = parameters;
    if (needMoneyRewardMoney.length > 0) {
      for (let index = 0; index < needMoneyRewardMoney.length; index++) {
        const element = needMoneyRewardMoney[index];
        const _price =
          parameters.tpp && parameters.tpp < parameters.price ? parameters.tpp : parameters.price;
        const needNum = Math.ceil(element.needMoney / _price);
        const discountPrice = (needNum * _price - element.rewardMoney) / needNum;
        if (discountPrice < price) {
          price = discountPrice;
          type = `满${element.needMoney}元减${element.rewardMoney}元`;
        }
      }
    }
    // 满减 -end-

    // 优惠券 -start-
    const { quotaDiscount } = parameters;
    if (quotaDiscount.length > 0) {
      for (let index = 0; index < quotaDiscount.length; index++) {
        const element = quotaDiscount[index];
        const _price =
          parameters.tpp && parameters.tpp < parameters.price ? parameters.tpp : parameters.price;
        const needNum = Math.ceil(element.quota / _price);
        const discountPrice = (needNum * _price - element.discount) / needNum;
        if (discountPrice < price) {
          price = discountPrice;
          type = `领券，满${element.quota}元减${element.discount}元`;
        }
      }
    }
    // 优惠券 -end-
    if (price <= goodPrice) {
      result = true;
    } else {
      type = '';
    }
    return [result, price, type];
  }

  public async run() {
    const products = await this.getProducts();
    for await (const productItem of products) {
      // 作为一个负责任的程序我们温柔一点
      await sleep(SLEEPTIME);
      const productInfo = await this.getProductInfo(productItem.id);
      const parameters = await this.extractParametersOfHTML(productInfo, productItem).catch(
        (err) => {
          Email.getInstance().sendEmail({
            subject: err.message,
          });
        },
      );
      if (!parameters) continue;

      const [isSuitablePriceResult, suitablePrice, suitablePriceType] = this.isSuitablePrice(
        parameters,
        productItem.price,
      );
      if (!isSuitablePriceResult) continue;

      const text = `
        sku: ${productItem.id}<br />
        当前价: ${suitablePrice.toFixed(2)}<br />
        好价: ${productItem.price}<br />
        好价类型: ${suitablePriceType}<br />
        平台: ${productItem.platform}<br />
      `;
      await Email.getInstance().sendEmail({
        subject: parameters.skuName,
        text,
      });
    }
    process.exit(0);
    // if (this.extractParameterErr) {
    //   Email.getInstance().sendEmail({
    //     subject: '参数收集 失败',
    //     text: this.extractParameterErr,
    //   });
    // }
  }
}

new GoogPriceRemind(keysJson).run().catch((err) => {
  console.log();
  console.log(new Date());
  console.log(err.stack);
  Email.getInstance().sendEmail({
    subject: err.message,
  });
});
