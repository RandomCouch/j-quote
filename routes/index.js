var express = require('express');
var router = express.Router();
var shopifyAPI = require('shopify-node-api');
var randtoken = require('rand-token');
var sqlService = require('../services/sql-service.js');
var config = require("../config.json");

function escapeHtml(text) {
  var map = {
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}
function reverseHtml(text) {
  var map = {
    '&quot;' : '"' ,
    '&#039;' : "'"
  };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}


router.get('/', function(req, res, next) {
        var auth = 0;
        if(req.query.shop){
            var cShop = req.query.shop;
            //Look for shop
            sqlService.query("SELECT id, access_code FROM clients WHERE store='" + cShop + "' AND app_install='" + config.appID + "'", function(clientInfo){
               if(clientInfo.length > 0){
                   //client exists
                    auth = 1;
                    req.session.auth = 1;
                    var clientToken = clientInfo[0].access_code;
                    var Shopify = new shopifyAPI({
                      shop: cShop, // MYSHOP.myshopify.com 
                      shopify_api_key: config.apiKey, // Your API key 
                      shopify_shared_secret: config.appSecret, // Your Shared Secret 
                      access_token: clientToken, //permanent token 
                    });
                     
                     res.render('index', {title: config.name, store: cShop, auth:auth});
               } else{
                   //client doesn't exist
                   auth = 0;
                   req.session.auth = 0;
                   res.redirect("/auth/shopify?shop=" + cShop);
               }
            });
        }else{
            auth = 0;
            req.session.auth = 0;
            res.render("register", {title: "App installation", auth:auth});
        }
});
router.post("/", function(req,res,next){
    var storeName = req.body.storeName;
    res.redirect("/auth/shopify?shop=" + storeName);
});

router.post("/getUninstall", function(req,res,next){
   console.log(req.body.domain + " has uninstalled");
   sqlService.query("DELETE FROM clients WHERE store='" + req.body.domain + "' AND app_install='" + config.appID + "'", function(result){
      req.session.auth = 0;
      res.send("success");
   });
   
});

module.exports = router;
