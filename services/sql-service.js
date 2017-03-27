var mysql = require('mysql');
var config = require('./config.json');

//Old mysql module
var createQuery = function(query, next) {
    var connection = mysql.createConnection({
        host: config.DB_HOST,
        user: config.DB_USER,
        password: config.DB_PASS,
        database: config.DB_NAME
    });

    connection.connect(function(err, conn) {
        if (err) {
            console.log('MySQL connection error: ', err);
            process.exit(1);
        }

    });
    connection.query(query, function(err, rows, fields) {
        if (err) throw err;
        next(rows);
    });
    connection.end();
};


exports.query = function(query, next) {
    createQuery(query, next);
};

exports.editSettings = function(data, next){
  //first check if the variable exists
  createQuery("SELECT * FROM client_settings WHERE variable='" + data.variable + "' AND app_id='" + data.appID + "' AND client_id='" + data.clientID + "'", function(result){
     if(result.length > 0){
         //settings exist
         createQuery("UPDATE client_settings SET value='" + data.value + "' WHERE client_id='" + data.clientID + "' AND app_id='" + data.appID + "' AND variable='" + data.variable + "'", function(result){
            //updated setting
            next();
         });
     }else{
         //settings don't exist
         createQuery("INSERT INTO client_settings (client_id, app_id, variable, value) VALUES ('" + data.clientID + "','" + data.appID + "','"+ data.variable + "','" + data.value + "')", function(result){
            //got new settings
            next();
         });
     }
  });
};

exports.getSettings = function(varname, clientID, next){
    createQuery("SELECT * FROM client_settings WHERE client_id='" + clientID + "' AND variable='" + varname + "'", function(result){
        if(result.length > 0){
            next(result[0].value);
        }else{
            next(null);
        }
    });
};