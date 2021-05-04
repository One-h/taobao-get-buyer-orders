let list = [];
let csv;
let interval;

// 淘宝有验证机制，如果太快操作会弹出验证码
// 设置每页等待时间及随机时间，单位毫秒
let nextPageWaitTime = 15000;
let nextPageRandomTime = 10000;
// 设置页面加载时间及随机时间，如果网络偏慢需要设置长时间
let loadWaitTime = 5000;
let loadRandomTime = 5000;

// 获取当前页面的订单数据，并push到list内。
function getCurrentOrder() {
    console.log('start current page')
    let nodeList = document.getElementsByClassName('js-order-container');

    for (let i of nodeList) {
        let order = {};
        // tbody 有两个， 第一个是标题栏，内含时间、订单号、店铺名
        // 第二个为 具体的商品信息。下含多个tr，每个tr为一种商品，可能还有保险服务，需要剔除
        let tbody = i.getElementsByTagName('tbody');

        order.id = tbody[0].getElementsByTagName('td')[0].children[1].textContent.replace('订单号: ', '');
        order.date = tbody[0].getElementsByTagName('td')[0].children[0].textContent;
        order.seller = tbody[0].getElementsByTagName('td')[1].textContent;;

        order.subOrders = [];

        for (let j = 0; j < tbody[1].children.length; j++) {

            //第一列是 商品名称 分类等
            //第二列是 原价 现价
            //第三列是 数量
            //第四列是 退换货  投诉 售后 查看退款等
            //第五列是 总价 运费
            //第六列是 订单详情，物流， 交易状态等
            //第七列是 确认收货 开票 评价等。
            let sub = tbody[1].children[j];

            //如果是保险服务|增值服务|阶段|，应该没有img标签， 则跳过该循环，继续下个循环
            if (sub.children[0].getElementsByTagName('img').length == 0) {
                continue;
            }

            let subOrder = {};

            let firstColumn = sub.children[0].getElementsByTagName('p');
            subOrder.text = firstColumn[0].textContent;
            subOrder.skuText = firstColumn[1]?.textContent;
            //商品详情url
            subOrder.itemUrl = 'https' + firstColumn[0].getElementsByTagName('a')[0].getAttribute('href');
            //交易快照
            if (firstColumn[0].getElementsByTagName('a')[1]) {
                subOrder.snapShot = 'https' + firstColumn[0].getElementsByTagName('a')[1]?.getAttribute('href');
            }


            //如果有原价现价，则有两个p标签，不然为一个
            let secondColumn = sub.children[1].getElementsByTagName('p');
            if (secondColumn.length == 1) {
                subOrder.originalPrice = secondColumn[0].textContent.replace('￥', '');
                subOrder.realTotalPrice = secondColumn[0].textContent.replace('￥', '');
            }
            else {
                subOrder.originalPrice = secondColumn[0].textContent.replace('￥', '');
                subOrder.realTotalPrice = secondColumn[1].textContent.replace('￥', '');
            }

            subOrder.quantity = sub.children[2].textContent;

            // 单独商品的状态，当出现 退款成功|查看退款  代表已经退款
            subOrder.status = /(退款成功|查看退款)/g.test(sub.children[3].textContent) ? '退款' : '';

            //只有第一行才有总价 订单详情等
            if (j == 0) {
                order.actualFee = sub.children[4].getElementsByTagName('p')[0].textContent.replace('￥', '');

                // 整个订单的状态，交易成功|买家已付款|卖家已发货|交易关闭
                order.status = sub.children[5].getElementsByTagName('p')[0].textContent;
                order.orderDetailUrl = 'https:' + sub.children[5].getElementsByTagName('a')[0].getAttribute('href');
            }

            order.subOrders.push(subOrder)
        }

        list.push(order);
    }
    return list;
}

// 获取’下一页‘的button
function getNextPageButton() {
    return [...document.getElementsByTagName('button')].find(x => x.textContent == '下一页');
}

//产生随机数， 基于time + （0-random）的数
function getRandomTime(time, random) {
    return time + Math.floor(random * Math.random())
}

// 前往下一页并定时开启获取下一页数据
function getNextPageOrder() {
    console.log('start next page')
    let nextButton = getNextPageButton();
    //遍历完成 转成csv格式文本
    if (nextButton.disabled) {
        finish()
        return;
    }
    nextButton.click();
    setTimeout(getCurrentOrder, getRandomTime(loadWaitTime, loadRandomTime));
}

// 当全部订单完成后，执行输出操作
function finish(){
    console.log('finish')
    clearInterval(interval);

    //打印list 对象
    //console.log(toCSV(list));
    //打印csv文本
    csv = toCSV(list)
    console.log(csv);


    
}

//复制csv文本进剪切板
function copyCSV(){
    let copy = function (e) {
        e.preventDefault();
        console.log('copy');
        var text = csv;
        if (e.clipboardData) {
            e.clipboardData.setData('text/plain', text);
        } else if (window.clipboardData) {
            window.clipboardData.setData('Text', text);
        }
    }
    window.addEventListener('copy', copy);
    document.execCommand('copy');
    window.removeEventListener('copy', copy);
}


// 获取所有订单信息
function getAllOrder() {
    console.log('start getAllOrder');
    getCurrentOrder();

    interval = setInterval(getNextPageOrder, getRandomTime(nextPageWaitTime, nextPageRandomTime));

}

// 将list数据转换为csv格式
// 订单号要加=""， 不然会被自动转成科学计数法，精度丢失
// 可以注释掉不需要的字段，需要上下一起注释。
function toCSV(data) {
    let s = "日期," +
    "订单号," +
    "商品名," +
    "分类," +
    "单价," +
    "数量," +
    "商品状态," +
    "总价," +
//    "订单状态," +
//    "店铺名," +
//    "订单url," +
//    "商品url," +
//    "快照url," +
    "\n";
    return s + data.map(order => {
        return order.subOrders.map((item, index) => {
            return `${index == 0 ? order.date : ''},` +
            `="${index == 0 ? order.id : ''}",` +
            `${item.text},`+
            `${item.skuText},` +
            `${item.realTotalPrice},` +
            `${item.quantity},` +
            `${item.status},` +
            `${index == 0 ? order.actualFee : ''},` +
//            `${index == 0 ? order.status : ''},` +
//            `${index == 0 ? order.seller : ''},` +
//            `${index == 0 ? order.orderDetailUrl : ''},` +
//            `${item.itemUrl},${item.snapShot??''},` +
            `\n`
        }).join('');
    }).join('');
}

getAllOrder();