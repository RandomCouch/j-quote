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
    var shop = req.query.shop;
    res.render("comingSoon", {title: "Quote requests", auth:1, store:shop})
});

module.exports = router;