create database good_price_remind character set utf8;

CREATE TABLE `products` (
  `id` mediumint(8) unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint(8) unsigned NOT NULL DEFAULT '0' COMMENT '商品id(sku)',
  `product_name` varchar(255) NOT NULL DEFAULT '' COMMENT '商品名称',
  `product_price` decimal(10,2) unsigned NOT NULL DEFAULT '0.00' COMMENT '商品价格',
  `product_platform` char(10) NOT NULL DEFAULT '' COMMENT '网站平台',
  `product_status` enum('0','1') NOT NULL DEFAULT '1' COMMENT '是否正常? 0:否; 1:是',
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_date` datetime NOT NULL DEFAULT '0000-00-00 00:00:00' COMMENT '最后更新日期',
  PRIMARY KEY (`id`),
  KEY `product` (`product_id`,`product_platform`,`product_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='商品信息';
