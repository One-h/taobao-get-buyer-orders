let list = [];
let csv;

// 淘宝有验证机制，如果太快操作会弹出验证码
// 设置每页等待时间及随机时间，单位毫秒
let nextPageWaitTime = 5000;
let nextPageRandomTime = 5000;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// 获取当前页面的订单数据，并push到list内。
function getCurrentOrder() {
    console.log('get current page\'s data')
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
    return;
}

// 获取’下一页‘的button
function getNextPageButton() {
    return [...document.getElementsByTagName('button')].find(x => x.textContent == '下一页');
}

//产生随机数， 基于time + （0-random）的数
function getRandomTime(time, random) {
    return time + Math.floor(random * Math.random())
}

function clickButton(element) {
    let { x, y } = element.getBoundingClientRect();
    x = Math.floor(x);
    y = Math.floor(y);

    let ev = new MouseEvent("click", {
        screenX: 1452,
        screenY: 486,
        clientX: x,
        clientY: y,
        button: 1,
        x: x,
        y: y,
        offsetX: x,
        offsetY: y,
        pageX: x,
        pageY: y,
        layerX: x,
        layerY: y,
    })
    ev.initEvent("click", true, true);
    element.dispatchEvent(ev);
}

// 前往下一页并定时开启获取下一页数据
async function getNextPageOrder() {
    let nextButton = getNextPageButton();
    while (!nextButton.disabled) {
        console.log('go to next page')
        clickButton(nextButton);

        await sleep(500);
        while (checkLoading()) {
            await sleep(500);
        }
        await sleep(500);
        getCurrentOrder();

        await sleep(getRandomTime(nextPageWaitTime, nextPageRandomTime));
    }
    //遍历完成 转成csv格式文本
    finish()
}

// 判断是否在加载
function checkLoading() {
    // loading-mod__loading___3nGTY loading-mod__hidden___1tIoI 当loading图标隐藏时候,会出现loading-mod__hidden___1tIoI的class
    return [...document.getElementsByClassName("loading-mod__loading___3nGTY")[0].classList].find(x => x.indexOf("hidden") >= 1) ? false : true;
}

// 当全部订单完成后，执行输出操作
function finish() {
    console.log('finish')
    //打印csv文本
    csv = toCSV(list)
    console.log(csv);



}

//复制csv文本进剪切板
function copyCSV() {
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
async function getAllOrder() {
    console.log('start getAllOrder');
    getCurrentOrder();

    await getNextPageOrder();

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
        "订单状态," +
        //    "店铺名," +
        //    "订单url," +
        //    "商品url," +
        //    "快照url," +
        "\n";
    return s + data.map(order => {
        return order.subOrders.map((item, index) => {
            return `${index == 0 ? order.date : ''},` +
                `="${index == 0 ? order.id : ''}",` +
                `${item.text},` +
                `${item.skuText},` +
                `${item.realTotalPrice},` +
                `${item.quantity},` +
                `${item.status},` +
                `${index == 0 ? order.actualFee : ''},` +
                `${index == 0 ? order.status : ''},` +
                //            `${index == 0 ? order.seller : ''},` +
                //            `${index == 0 ? order.orderDetailUrl : ''},` +
                //            `${item.itemUrl},${item.snapShot??''},` +
                `\n`
        }).join('');
    }).join('');
}

getAllOrder();