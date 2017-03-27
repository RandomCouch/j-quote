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
                 
                 sqlService.query("SELECT *  FROM jq_costs WHERE client_id='" + clientID + "'", function(costs){
                    //Also get users tax rate
                    sqlService.getSettings("jq_taxRate", clientID, function(taxRate){
                        var tax = 0;
                       if(taxRate){
                           tax = taxRate;
                       }
                       res.render('costs', {title: config.name, store: cShop, auth:auth, costs:costs, tax:tax}); 
                    });
                   
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
router.post("/saveTax", function(req,res,next){
    var cShop = req.body.shop;
    var taxRate = req.body.taxRate;
    var auth = 0;
    sqlService.query("SELECT id, access_code FROM clients WHERE store='" + cShop + "' AND app_install='" + config.appID + "'", function(clientInfo){
       if(clientInfo.length > 0){
           //client exists
            auth = 1;
            req.session.auth = 1;
            var clientToken = clientInfo[0].access_code;
            var clientID = clientInfo[0].id;
             //Edit tax rate
             var data  = {
                 variable: 'jq_taxRate',
                 clientID: clientID,
                 appID: config.appID,
                 value: taxRate
             }
             sqlService.editSettings(data, function(r){
                console.log("Tax Rate updated");
                var result =  {
                    type: 'success',
                    message: 'Tax rate updated!'
                };
                res.send(result);
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
router.post("/addCost", function(req,res,next){
    var cShop = req.body.shop;
    var costLabel = escapeHtml(req.body.label);
    var costPrice = req.body.cost;
    var costTotal = req.body.total_cost;
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
            /*
            var Shopify = new shopifyAPI({
              shop: cShop, // MYSHOP.myshopify.com 
              shopify_api_key: config.apiKey, // Your API key 
              shopify_shared_secret: config.appSecret, // Your Shared Secret 
              access_token: clientToken, //permanent token 
            });
            */
             //Add cost
             sqlService.query("INSERT INTO jq_costs (label, cost, total_cost, client_id) VALUES ('" + costLabel + "','" + costPrice + "','" + costTotal + "','" + clientID + "')", function(r){
                //Added cost
                var data ={
                    type : 'success',
                    message: 'Added cost successfully'
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

router.post("/editCost", function(req,res,next){
    var cShop = req.body.shop;
    var cID = req.body.cID;
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
             if(cID){
                 var newLabel = escapeHtml(req.body.label);
                 var newCost = req.body.cost;
                 var newTotal = req.body.total_cost;
                 
                 sqlService.query("UPDATE jq_costs SET label='" + newLabel + "', cost='" + newCost +"', total_cost='" + newTotal + "' WHERE id='" + cID + "'", function(r){
                    var data = {
                        type: 'success',
                        message : "Cost updated!"
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

router.post("/deleteCost", function(req,res,next){
    var cShop = req.body.shop;
    var cID = req.body.cID;
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
             sqlService.query("DELETE FROM jq_costs WHERE id='" + cID + "'", function(r){
                //Added cost
                var data ={
                    type : 'success',
                    message: 'Deleted cost successfully'
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
