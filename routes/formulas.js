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
router.get("/", function(req,res,next){
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
                var clientID = clientInfo[0].id;
                var Shopify = new shopifyAPI({
                  shop: cShop, // MYSHOP.myshopify.com 
                  shopify_api_key: config.apiKey, // Your API key 
                  shopify_shared_secret: config.appSecret, // Your Shared Secret 
                  access_token: clientToken, //permanent token 
                });
                 //Get all costs of shop
                 
                 sqlService.query("SELECT *  FROM jq_formulas WHERE client_id='" + clientID + "'", function(formulas){
                    res.render('formulas', {title: config.name, store: cShop, auth:auth, formulas:formulas,}); 
                 });
                 
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
router.post("/addFormula", function(req,res,next){
    var cShop = req.body.shop;
    var fName = escapeHtml(req.body.fName);
    var showOnForm = req.body.showOnForm;
    var auth = 0;
    //Look for shop
    sqlService.query("SELECT id, access_code FROM clients WHERE store='" + cShop + "' AND app_install='" + config.appID + "'", function(clientInfo){
       if(clientInfo.length > 0){
           //client exists
            auth = 1;
            req.session.auth = 1;
            var clientToken = clientInfo[0].access_code;
            var clientID = clientInfo[0].id;
             //Add formula
             sqlService.query("INSERT INTO jq_formulas (label, show_on_form, client_id) VALUES ('" + fName + "','" + showOnForm + "','" + clientID + "')", function(r){
                //Added cost
                var data ={
                    type : 'success',
                    message: 'Added formula successfully'
                }
                res.send(data);
             });
       } else{
           //client doesn't exist
           auth = 0;
           req.session.auth = 0;
           var data = {
               type: 'error',
               error: "Client is missing, please re-install application"
           }
           res.send(data);
       }
    });
});
module.exports = router;