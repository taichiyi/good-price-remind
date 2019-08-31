export interface ConfigKeys {
  EmailAuthUser: string;
  EmailAuthPass: string;
  EmailHost: string;
  EmailPort: number;
  toEmail: string;
  sqlUser?: string;
  sqlPasswd?: string;
  sqlHost?: string;
  sqlPort?: number;
  sqlDbname?: string;
}

export interface Product {
  id: number;
  price: number;
  name: string;
  platform: string;
}

export interface Parameters {
  warestatus: number; // 库存状态 0：下架；1：销售中
  skuName: string; // 商品名称
  price: number; // 普通价
  tpp: number; // Plus价
  cid: number; //
  pingou: number; // 是否为拼购 1：是 其他：不是
  popId: number; // popId(如果为“拼购”则此字段不存在)
  needNumRebate: { needNum: number, rebate: number }[]; // 满几件打几折
  needMoneyRewardMoney: { needMoney: number, rewardMoney: number }[]; // 满减
  quotaDiscount: { quota: number, discount: number }[]; // 优惠券
  [key: string]: any;
}
