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
                 
                 sqlService.query("SELECT *  FROM jq_fields WHERE client_id='" + clientID + "'", function(fields){
                     for(var i in fields){
                         if(fields[i].options != ""){
                             fields[i].options = fields[i].options.split("||");
                         }
                         for(var x in fields[i].options){
                             if(fields[i].options[x] == ""){
                                fields[i].options.splice(x, 1);
                             }
                         }
                     }
                    res.render('form', {title: config.name, store: cShop, auth:auth, fields:fields,}); 
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
router.post("/addField", function(req,res,next){
    var cShop = req.body.shop;
    var type = req.body.type;
    var label = escapeHtml(req.body.label);
    var extra_text = escapeHtml(req.body.extra_text);
    var options = escapeHtml(req.body.options);
    var is_required = req.body.is_required;
    var auth = 0;
    //Look for shop
    console.log("ADDCOST: SHOP : " + cShop);
    sqlService.query("SELECT id, access_code FROM clients WHERE store='" + cShop + "' AND app_install='" + config.appID + "'", function(clientInfo){
       if(clientInfo.length > 0){
           //client exists
            auth = 1;
            req.session.auth = 1;
            var clientToken = clientInfo[0].access_code;
            var clientID = clientInfo[0].id;
             //Add cost
             sqlService.query("INSERT INTO jq_fields (type, label, extra_text, options, is_required, client_id) VALUES ('" + type + "','" + label + "','" + extra_text + "','" + options + "','" + is_required + "','" + clientID + "')", function(r){
                //Added cost
                var data ={
                    type : 'success',
                    message: 'Added field successfully'
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
router.post("/editField", function(req,res,next){
    var cShop = req.body.shop;
    var fID = req.body.fID;
    var auth = 0;
    //Look for shop
    sqlService.query("SELECT id, access_code FROM clients WHERE store='" + cShop + "' AND app_install='" + config.appID + "'", function(clientInfo){
       if(clientInfo.length > 0){
           //client exists
            auth = 1;
            req.session.auth = 1;
            var clientToken = clientInfo[0].access_code;
            var clientID = clientInfo[0].id;
             //Edit cost
             if(fID){
                 var newLabel = escapeHtml(req.body.label);
                 var eText = escapeHtml(req.body.extra_text);
                 var options = escapeHtml(req.body.options);
                 
                 sqlService.query("UPDATE jq_fields SET type='" + req.body.type + "', label='" + newLabel +"', extra_text='" + eText + "', options='" + options + "', is_required='" + req.body.is_required + "' WHERE id='" + fID + "'", function(r){
                    var data = {
                        type: 'success',
                        message : "Field updated!"
                    } 
                    res.send(data);
                 });
             }
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
router.post("/deleteField", function(req,res,next){
    var cShop = req.body.shop;
    var fID = req.body.fID;
    var auth = 0;
    //Look for shop
    sqlService.query("SELECT id, access_code FROM clients WHERE store='" + cShop + "' AND app_install='" + config.appID + "'", function(clientInfo){
       if(clientInfo.length > 0){
           //client exists
            auth = 1;
            req.session.auth = 1;
            var clientToken = clientInfo[0].access_code;
            var clientID = clientInfo[0].id;
             //Add cost
             sqlService.query("DELETE FROM jq_fields WHERE id='" + fID + "'", function(r){
                //Added cost
                var data ={
                    type : 'success',
                    message: 'Deleted field successfully'
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