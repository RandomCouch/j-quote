var express = require('express');
var router = express.Router();
var shopifyAPI = require('shopify-node-api');
var sqlService = require('../services/sql-service.js');
var config = require("../config.json");

router.get('/', function(req, res, next) {
        var auth = 0;
        if(req.query.shop){
            var cShop = req.query.shop;
            //Look for shop
            sqlService.query("SELECT id, access_code FROM clients WHERE store='" + cShop + "' AND app_install='" + config.appID + "'", function(clientInfo){
               if(clientInfo.length > 0){
                   //client exists
                   req.session.auth = 1;
                   auth = 1;
                   var clientToken = clientInfo[0].access_code;
                    var Shopify = new shopifyAPI({
                      shop: cShop, // MYSHOP.myshopify.com 
                      shopify_api_key: config.apiKey, // Your API key 
                      shopify_shared_secret: config.appSecret, // Your Shared Secret 
                      access_token: clientToken, //permanent token 
                    });
                    //We are authenticated
                    res.render('settings', {title: "Settings", store: cShop, auth:auth});
                     
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
            res.render("register", {title: "App installation", auth: auth});
        }
});

module.exports = router;