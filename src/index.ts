import { ConfigKeys, Product, Parameters } from './interfaces';
import keysJson from './config';
import MysqlModel from './models';
import Email, { sleep, requestPromise } from './utils';
import { TIMEOUT, SLEEPTIME } from './constants';

class GoogPriceRemind {
  private keys:ConfigKeys|undefined;
  private extractParameterErr = '';

  public constructor(keys: ConfigKeys) {
    this.keys = keys;
  }

  private async getProducts(): Promise<Product[] | null> {
    if (this.keys === undefined) return null;
    const { sqlHost, sqlUser, sqlPasswd, sqlPort, sqlDbname } = this.keys;
    let products;
    if(sqlHost && sqlUser && sqlPasswd && sqlPort && sqlDbname) {
      products = await MysqlModel.getInstance().productsSelectQuery({
        attribute: ['product_id as id', 'product_name as name', 'product_price as price', 'product_platform as platform'],
        where: [
          {
            key: 'product_status',
            value: '1',
          },
        ]
      });
    } else {
      products = (await import("./products")).default;
    }
    return products;
  }

  private async getProductInfo(productID:number): Promise<string | undefined> {
    const url = `https://item.m.jd.com/product/${productID}.html`;
    const params = {
      url,
      method: 'get',
      timeout: TIMEOUT,
      gzip: true,
      headers: {
        'Accept': '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7,vi;q=0.6',
        'Cache-Control': 'no-cache',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3514.2 Safari/537.36',
      },
    };
    const { body: res, err } = await requestPromise(params);
    if (err) {
      let text = '';
      text += `sku: ${productID}<br />`;
      text += `错误信息: ${err.message}<br />`;
      Email.getInstance().sendEmail({
        subject: '获取商品信息 失败',
        text,
      });
    }
    return res;
  }

  private async getProductCoupon (productID:number, cid: number, popId:number): Promise<string | undefined> {
    const url = `https://wq.jd.com/mjgj/fans/queryusegetcoupon?callback=getCouponListCBA&platform=3&cid=${cid}&popId=${popId}&sku=${productID}`;
    const params = {
      url,
      method: 'get',
      timeout: TIMEOUT,
      gzip: true,
      headers: {
        'Accept': '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7,vi;q=0.6',
        'Cache-Control': 'no-cache',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3514.2 Safari/537.36',
      },
    };
    const { body: res, err } = await requestPromise(params);
    if (err) {
      let text = '';
      text += `sku: ${productID}<br />`;
      text += `错误信息: ${err.message}<br />`;
      Email.getInstance().sendEmail({
        subject: '获取商品优惠券 失败',
        text,
      });
    }
    return res;
  };

  private async extractParameterOfHTML (HTMLText: string, productID: number): Promise<[boolean, Parameters]> {
    let status = false; // 关键参数是否合法
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
    if (warestatusResult) {
      parameters.warestatus = parseInt(warestatusResult[1],10);
    }

    const SKUNAME_REGEX = `"skuName":"([^"]*)"`;
    const skuNameResult = HTMLText.match(SKUNAME_REGEX);
    if (skuNameResult) {
      parameters.skuName = skuNameResult[1];
    }

    const PRICE_REGEX = `"p":"([0-9.]+)"`;
    const priceResult = HTMLText.match(PRICE_REGEX);
    if (priceResult) {
      parameters.price = parseFloat(priceResult[1]);
    }

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
    const NEEDNUM_REBATE_ALL_REGEX = /\\"needNum\\":\\"([0-9]+)\\"([^"]*)\\"rebate\\":\\"([0-9.]+)\\"/g;
    const needNumRebateAllResult = HTMLText.match(NEEDNUM_REBATE_ALL_REGEX);
    if (needNumRebateAllResult) {
      const NEEDNUM_REBATE_REGEX = /\\"needNum\\":\\"([0-9]+)\\"([^"]*)\\"rebate\\":\\"([0-9.]+)\\"/;
      for (let index = 0; index < needNumRebateAllResult.length; index++) {
        const element = needNumRebateAllResult[index];
        const needNumRebateResult = element.match(NEEDNUM_REBATE_REGEX);
        if (needNumRebateResult) {
          parameters.needNumRebate.push({
            needNum: parseInt(needNumRebateResult[1], 10),
            rebate: parseFloat(needNumRebateResult[3]),
          });
        }
      }
    }
    // 满几件打几折 -end-

    // 满减 -start-
    const NEEDMONEY_REWARDMONEY_ALL_REGEX = /\\"needMoney\\":\\"([0-9.]+)\\"([^"]*)\\"rewardMoney\\":\\"([0-9.]+)\\"/g;
    const needMoneyRewardMoneyAllResult = HTMLText.match(NEEDMONEY_REWARDMONEY_ALL_REGEX);
    if (needMoneyRewardMoneyAllResult) {
      const NEEDMONEY_REWARDMONEY_REGEX = /\\"needMoney\\":\\"([0-9.]+)\\"([^"]*)\\"rewardMoney\\":\\"([0-9.]+)\\"/;
      for (let index = 0; index < needMoneyRewardMoneyAllResult.length; index++) {
        const element = needMoneyRewardMoneyAllResult[index];
        const needMoneyRewardMoneyResult = element.match(NEEDMONEY_REWARDMONEY_REGEX);
        if (needMoneyRewardMoneyResult) {
          parameters.needMoneyRewardMoney.push({
            needMoney: parseFloat(needMoneyRewardMoneyResult[1]),
            rewardMoney: parseFloat(needMoneyRewardMoneyResult[3]),
          });
        }
      }
    }
    // 满减 -end-

    // 优惠券 -start-
    if (parameters.cid !== -1 && parameters.popId !== -1) {
      const productCouponText = await this.getProductCoupon(productID, parameters.cid, parameters.popId);
      if (productCouponText) {
        const QUOTA_DISCOUNT_ALL_REGEX = /"quota":([0-9.]+)([^}]*)"discount":([0-9.]+)/g;
        const quotaDiscountAllResult = productCouponText.match(QUOTA_DISCOUNT_ALL_REGEX);
        if (quotaDiscountAllResult) {
          const QUOTA_DISCOUNT_REGEX = /"quota":([0-9.]+)([^}]*)"discount":([0-9.]+)/;
          for (let index = 0; index < quotaDiscountAllResult.length; index++) {
            const element = quotaDiscountAllResult[index];
            const quotaDiscountResult = element.match(QUOTA_DISCOUNT_REGEX);
            if (quotaDiscountResult) {
              parameters.quotaDiscount.push({
                quota: parseFloat(quotaDiscountResult[1]),
                discount: parseFloat(quotaDiscountResult[3]),
              });
            }
          }
        }
      }
    }
    // 优惠券 -end-

    if (
      parameters.warestatus !== -1 &&
      parameters.price !== -1 &&
      parameters.skuName !== ''
    ) {
      status = true;
    }

    let errStr = '';
    for (const key in parameters) {
      // if (!parameters.hasOwnProperty(key)) continue;
      if (!Object.prototype.hasOwnProperty.call(parameters, key)) continue;
      if (key === 'pingou') {
        if (parameters[key] === 1) {
          if (errStr === '') errStr += `${productID}:<br />`;
          errStr += `  ${key}: 此商品为拼购<br />`;
        }
      } else if (parameters[key] === -1) {
        if (errStr === '') errStr += `${productID}:<br />`;
        errStr += `  ${key}: 收录失败<br />`;
      }
    }

    if (errStr) {
      errStr += '<br />';
      this.extractParameterErr = errStr;
    }

    return [status, parameters];
  }

  private isSuitablePrice(parameters: Parameters, goodPrice:number ):[boolean,number,string] {
    let result = false; // 是否为好价
    let price = parameters.price;
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
        const discountPrice = parameters.price  * element.rebate / 10;
        if (discountPrice<price) {
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
        const _price = (parameters.tpp && parameters.tpp < parameters.price) ? parameters.tpp :parameters.price;
        const needNum = Math.ceil(element.needMoney / _price);
        const discountPrice = (needNum * _price - element.rewardMoney) / needNum;
        if (discountPrice<price) {
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
        const _price = (parameters.tpp && parameters.tpp < parameters.price) ? parameters.tpp :parameters.price;
        const needNum = Math.ceil(element.quota / _price);
        const discountPrice = (needNum * _price - element.discount) / needNum;
        if (discountPrice<price) {
          price = discountPrice;
          type = `领券，满${element.quota}元减${element.discount}元`;
        }
      }
    }
    // 优惠券 -end-

    if (price<=goodPrice) {
      result = true;
    }
    return [result, price, type];
  }

  public async run() {
    const products = await this.getProducts();
    if (products) {
      // 成功
      for (let index = 0; index < products.length; index++) {

        // 作为一个负责任的程序我们温柔一点
        await sleep(SLEEPTIME);

        const productItem = products[index];
        const productInfo = await this.getProductInfo(productItem.id)
        if (productInfo) {
          const [isValid, parameters] = await this.extractParameterOfHTML(productInfo, productItem.id);
          if (!isValid) continue;
          const [isSuitablePriceResult,suitablePrice ,suitablePriceType] = this.isSuitablePrice(parameters, productItem.price);
          if (isSuitablePriceResult) {
            // 好价
            let text = '';
            text += `sku: ${productItem.id}<br />`;
            text += `当前价: ${suitablePrice.toFixed(2)}<br />`;
            text += `好价: ${productItem.price}<br />`;
            text += `好价类型: ${suitablePriceType}<br />`;
            text += `平台: ${productItem.platform}<br />`;
            await Email.getInstance().sendEmail({
              subject: parameters.skuName,
              text,
            });
          }
        }
      }
      if (this.extractParameterErr) {
        Email.getInstance().sendEmail({
          subject: '参数收集 失败',
          text: this.extractParameterErr,
        });
      }
    } else {
      // 失败
      Email.getInstance().sendEmail({
        subject: '从数据库和本地获取商品列表 失败',
      })
    }
  }
}

new GoogPriceRemind(keysJson).run()
