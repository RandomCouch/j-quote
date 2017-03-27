var express = require('express');
var router = express.Router();
var shopifyAPI = require('shopify-node-api');
var randtoken = require('rand-token');
var sqlService = require('../services/sql-service.js');
var config = require('../config.json');
var appID = config.appID;
var nonce = "";

router.get('/shopify', function(req, res, next) {
      var clientShop = "";
      if(req.query.shop){
          clientShop = req.query.shop;
      }
      //Check if client exists
      var cquery = "SELECT * FROM clients WHERE store='" + clientShop + "' AND app_install='" + appID + "'";
      sqlService.query(cquery, function(result){
         if(result.length > 0){
             //Client exists so display the app
             res.redirect("/?shop="  + clientShop);
         } else{
             console.log("No existing client with that store url");
             //Client doesn't exist so request auth
             if(!clientShop.endsWith(".myshopify.com")){
                clientShop = clientShop + ".myshopify.com";
            }
            clientShop.replace("http://", "");
            clientShop.replace("https://", "");
            req.session.storeName = clientShop;
            nonce = randtoken.uid(8); 
            console.log("Nonce :  " + nonce);
            req.session.nonce = nonce;
            var Shopify = new shopifyAPI({
              shop: clientShop, // MYSHOP.myshopify.com 
              shopify_api_key: config.apiKey, // Your API key 
              shopify_shared_secret: config.appSecret, // Your Shared Secret 
              shopify_scope: config.scope,
              redirect_uri: config.redirectURI,
              nonce: nonce // you must provide a randomly selected value unique for each authorization request 
            });
            var auth_url = Shopify.buildAuthURL();
            res.redirect(auth_url);
         }
      });
});

router.get('/shopify/callback', function(req,res,next){
    var query_params = req.query;
    //console.log("QUERY PARAMS: " + JSON.stringify(query_params));
    if(query_params.state == req.session.nonce){
        var Shopify = new shopifyAPI({
           shop: req.session.storeName,
          shopify_api_key: config.apiKey, // Your API key 
          shopify_shared_secret: config.appSecret, // Your Shared Secret 
          shopify_scope: config.scope,
          redirect_uri: config.redirectURI,
          nonce: req.session.nonce 
           
        });

        Shopify.exchange_temporary_token(query_params, function(err,data){
           if(err){
               console.log("There was an error exchanging temporary token with Shopify");
           }else{
               var newToken = data.access_token;
               //create new client
               //But first check if client exists already, if so, update the acess token and nonce
               sqlService.query("SELECT * FROM clients WHERE store='" + req.session.storeName + "' AND app_install='" + appID + "'", function(result){
                   var query = "INSERT INTO clients (store,access_code,nonce,app_install) VALUES ('" + req.session.storeName + "','" + newToken + "','"+ req.session.nonce + "','" + appID + "')";
                  if(result.length > 0){
                       var existingID = result[0].id;
                      query = "UPDATE clients SET access_code='" + newToken + "', nonce='" + req.session.nonce + "' WHERE id='" + existingID + "'";
                  }
                  req.session.auth = 1;
                  sqlService.query(query, function(){
                      //redirect user to main page
                      req.session.shopify =  new shopifyAPI({
                          shop: req.session.storeName, // MYSHOP.myshopify.com 
                          shopify_api_key: config.apiKey, // Your API key 
                          shopify_shared_secret: config.appSecret, // Your Shared Secret 
                          access_token: newToken, //permanent token 
                        });
                      var webHook = {
                          webhook: {
                              topic : "app\/uninstalled",
                              address : "http://j-quote-randomcouch.c9users.io/getUninstall",
                              format: "json"
                          }
                      };
                      
                      req.session.shopify.post("/admin/webhooks.json", webHook, function(err, webhooks){
                         if(err){
                             console.log("Couldn't create webhook");
                         }else{
                             console.log("Created webhook " + JSON.stringify(webhooks));
                         }
                      });
                      req.session.auth = 1;
                      res.redirect("/?shop=" + req.session.storeName);
                  });
               });
           }
        });
    }
});

module.exports = router;