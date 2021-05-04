# 获取淘宝买家订单脚本
通过获取页面上的dom元素内的信息以及自动下一页，获取全部订单信息，并在控制台输出csv格式文本。

## 使用说明
1. 淘宝进入我的订单页面（ https://buyertrade.taobao.com/trade/itemlist/list_bought_items.htm ），可以使用自带的筛选条件过滤数据。
2. 打开index.js，复制代码至控制台执行。
3. 等待代码执行完成，会将结果输出在控制台,手动复制或者可以在控制台手动执行copyCSV()复制至剪切板。 创建csv文件，将结果粘贴即可。

## 数据结构
```
{
    [
        id, //订单号
        date, //日期
        seller， //店铺名
        actualFee， //总价
        status， //订单状态
        orderDetailUrl，//订单详情url
        subOrders: [
            {
                text, //商品名
                skuText, //分类
                itemUrl, //商品详情url
                snapShot, //交易快照url
                originalPrice, //原价
                realTotalPrice, //现价
                quantity, //数量
                status, //商品状态
            }
        ]
    ]
}
```