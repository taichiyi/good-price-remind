# 好价提醒

通过`plus会员价` `满减` `折扣` `优惠券`判断当前价格是否低于你指定的价格，如果低于你指定的价格，则为好价，会发送邮件提醒。

目前支持京东商品

## 如何使用

### 第一步

把代码复制到本地:

``` bash
git clone git@gitee.com:taichiyi/good-price-remind.git
```

或者

``` bash
git clone git@github.com:taichiyi/good-price-remind.git
```

### 第二步

安装依赖:

``` bash
cd good-price-remind && yarn
```

### 第三步

创建配置文件:

在src目录下创建一个名为config.ts的文件

文件内容为(需要根据自己的情况配置)↓

``` javascript
export default {
  "EmailAuthUser": "xxx@xxx.com",
  "EmailAuthPass": "xxxxxxxxxxxxxxxx",
  "EmailHost": "smtp.qq.com",
  "EmailPort": 587,

  "toEmail": "xxx@xxx.com", // 收件人邮箱(符合指定价格时会发送提醒邮件到此邮箱)

  // 可选。支持2种获取商品列表的方法: 数据库和本地文件products.ts
  // 如果想从数据库获取需要建表(建表SQL语句可以参考good_price_remind.sql)并配置以下信息
  "sqlUser": "xxx",
  "sqlPasswd": "9693ee29027s85975ct6df802125bf58151e1800",
  "sqlHost": "120.29.127.131",
  "sqlPort": 3306,
  "sqlDbname": "good_price_remind",
};
```

### 第四步

运行:

``` bash
npm start
```

## crontab

可以把程序部署到服务器上，定时调用。例子：

``` bash
crontab -e
```

``` bash
# 每天10点整合20点整调用程序
0 10,20 * * * ~/.nvm/versions/node/v10.13.0/bin/node /home/username/good-price-remind/dist/index.js
```
