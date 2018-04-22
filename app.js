const NETWORK_TYPE = 'testnet';
const PORT = '28332';

const ERROR_CODE = '500';
const SUCCESS_CODE = '200;'

// HTTPサーバー用
var http = require('http');
var router = require('router');
var finalhandler = require('finalhandler');
var bodyParser = require('body-parser');

// bitcore
var bitcore = require('bitcore-lib');
var explorers = require('bitcore-explorers');
var insight = new explorers.Insight(NETWORK_TYPE);

// routing設定
var appRouter = router();
appRouter.use(bodyParser.urlencoded({extended: false}));
appRouter.use(bodyParser.json());

// ビットコインアドレスの生成
appRouter.get('/getNewAddress', function(req, res) {
    // 秘密鍵の生成
    var privateKey = new bitcore.PrivateKey(NETWORK_TYPE);
    // 秘密鍵から公開鍵を生成
    var publicKey = privateKey.toPublicKey();
    // 公開鍵からビットコインアドレスを生成
    var bitcoinAddress = publicKey.toAddress(NETWORK_TYPE);

    // レスポンス用のjsonを生成
    var json = JSON.stringify({
        'privateKey': privateKey.toString(),
        'publicKey': publicKey.toString(),
        'bitcoinAddress': bitcoinAddress.toString()
    });

    res.setHeader('Content-Type', 'Content-type: application/json');
    res.end(json);
});

// ビットコインアドレスの残高取得
appRouter.post('/getBalance', function(req, res) {
    // 受け取ったパラメーター:
    var params = req.body;
    var bitcoinAddress = params.bitcoinAddress;

    // ビットコインアドレスに紐づく情報を取得
    insight.address(bitcoinAddress, function (e, info) {
        // レスポンス用
        var json;

        if (e) {
            console.log('エラーが発生しました');
            console.log(e);

            json = JSON.stringify({
                'code': ERROR_CODE
            });
        } else {
            json = JSON.stringify({
                'code': SUCCESS_CODE,
                'balance': info.balance
            });
        }

        res.setHeader('Content-Type', 'Content-type: application/json');
        res.end(json);
    });
});

// ビットコインの送金
appRouter.post('/sendToAddress', function(req, res) {
    // 受け取ったパラメーター:
    var params = req.body;
    var privateKey = params.privateKey;
    var fromBitcoinAddress = params.fromBitcoinAddress;
    var toBitcoinAddress = params.toBitcoinAddress;
    var amount = Number(params.amount);

    // 未使用のトランザクションを取得(Unspent Transaction Output)
    insight.getUnspentUtxos(fromBitcoinAddress, function(e, utxos) {
        if (e) {
            console.log(e);
        } else {
            // 発行するトランザクションを生成
            var tx = new bitcore.Transaction()
            .fee(10000)
            .from(utxos)
            .to(toBitcoinAddress, amount)
            .change(fromBitcoinAddress)
            .sign(privateKey);

            // 生成したトランザクションをブロードキャストする
            insight.broadcast(tx, function(e, txId) {
                // レスポンス用
                var json;

                if (e) {
                    console.log(e);

                    json = JSON.stringify({
                        'code': ERROR_CODE
                    });
                } else {
                    json = JSON.stringify({
                        'code': SUCCESS_CODE,
                        'txId': txId
                    });
                }

                res.setHeader('Content-Type', 'Content-type: application/json');
                res.end(json);
            });
        }
    });
});

// サーバー起動
http.createServer(function onRequest(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Request-Method', '*');
	res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
	res.setHeader('Access-Control-Allow-Headers', '*');

    appRouter(req, res, finalhandler(req, res));
}).listen(PORT);

console.log("The server has been started.");
