(function(factory) {
  // Establish the root object, `window` (`self`) in the browser, `global`
  // on the server, or `this` in some virtual machines. We use `self`
  // instead of `window` for `WebWorker` support.
  var root = typeof self == 'object' && self.self === self && self ||
            typeof global == 'object' && global.global === global && global ||
            this;

  // Create a safe reference to the Underscore object for use below.
  var SmaRegi = {};

  //Underscore clone
  var _ = {};

  // Underscore clone functions
  // ---------------

  // An internal function for creating assigner functions.
  var createAssigner = function(keysFunc, defaults) {
    return function(obj) {
      var length = arguments.length;
      if (defaults) obj = Object(obj);
      if (length < 2 || obj == null) return obj;
      for (var index = 1; index < length; index++) {
        var source = arguments[index],
            keys = keysFunc(source),
            l = keys.length;
        for (var i = 0; i < l; i++) {
          var key = keys[i];
          if (!defaults || obj[key] === void 0) obj[key] = source[key];
        }
      }
      return obj;
    };
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    var type = typeof obj;
    return type === 'function' || type === 'object' && !!obj;
  };

  // Retrieve all the property names of an object.
  _.allKeys = function(obj) {
    if (!_.isObject(obj)) return [];
    var keys = [];
    for (var key in obj) keys.push(key);
    return keys;
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = createAssigner(_.allKeys);

  //asign SmaRegi object to root
  root.SmaRegi = factory(root, SmaRegi, _);

}(function(root, SmaRegi, _) {

  //Inquirely max limit
  SmaRegi.INC_LIMIT = 1000;

  //Update max limit
  SmaRegi.UPDATE_LIMIT = 500;

  // SmaRegi.Products
  // ---------------
  var Core = SmaRegi.Core = {};

  //
  // Target URL
  //
  var targetUrl = "https://webapi.smaregi.jp/access/";

  //
  //default parameter to access Smaregi
  //
  var initParams = {
    method : "post",
    contentType:"application/x-www-form-urlencoded;charset=UTF-8",
    headers:{
      'X_contract_id':"your contract id here",
      'X_access_token':"your access token here"
    },
    muteHttpExceptions:true,
    payload:{}
  };

  //
  // Format payload
  //
  var getPayload = function(proc_name, param_json) {
    return {
      "proc_name":proc_name,
      "params" : JSON.stringify(param_json)
    }
  };

  //
  // Query data
  //
  Core.query = function(proc_name, param_json) {
    var params = initParams;
    var payload = getPayload(proc_name, param_json);
    params.payload = payload;

    var result = UrlFetchApp.fetch(targetUrl, params);
    var o = JSON.parse(result.getContentText());

    if(o.error_code) {
      Logger.log(o);
    }
    return o;
  };

  //
  // Fetch all data
  //
  Core.fetchAll = function(fetch_func, each_func) {
    var dataArray = [];
    var total_count = SmaRegi.INC_LIMIT;
    each_func = each_func || function(result) {};
    for(var i = 1; i <= ((total_count / SmaRegi.INC_LIMIT) + 1) ; i++) {
      var o = fetch_func(i);
      if(o.error_code) {
        return o;
      }
      total_count = o.total_count - 0;
      for(var j = 0 ; j < o.result.length ; j++ ) {
        dataArray.push(o.result[j]);
        each_func(o.result[j]);
      }
    }
    o.result = dataArray;
    return o;
  };

  // Allow the `SmaRegi` object to serve as a global event bus, for folks who
  // want global "pubsub" in a convenient place.
  _.extend(SmaRegi, Core);

  // SmaRegi.Products
  // ---------------
  var Products = SmaRegi.Products = {};

  Products.fetch = function(page) {
    var command = {
      "limit":SmaRegi.INC_LIMIT,
      "page":page,
      "table_name":"Product"
    };

    return Core.query('product_ref',command);
  };

  //
  // Fetch All products data
  // Product IDs are keys of this map object.
  //
  Products.getNameList = function() {
    var o = Core.fetchAll(Products.fetch,null);

    if(o.error_code) {
      Logger.log(o);
      throw "Can't get products data";
    }

    return o.result;
  };

  //
  // Fetch All products data
  // Product IDs are keys of this map object.
  //
  Products.getNameMap = function() {
    var data = [];
    var each_func = function(result) {
      data[result.productId] = JSON.stringify(result);
    };

    var o = Core.fetchAll(Products.fetch,each_func);

    if(o.error_code) {
      Logger.log(o);
      throw "Can't get products data";
    }

    return data;
  };

  _.extend(SmaRegi, Products);

  // SmaRegi.Stocks
  // ---------------
  var Stocks = SmaRegi.Stocks = {};

  // Stock Update status
  // 15(Web API) is recomended by Smaregi.
  Stocks.STOCK_DIVISION_WEBAPI = 15;

  //
  // Fetch All products data
  //
  Stocks.fetchAll = function(storeId) {
    return Core.fetchAll(function(page) {
      var command = {
        "conditions":[{"storeId":storeId}],
        "limit":SmaRegi.INC_LIMIT,
        "page":page,
        "table_name":"Stock"
      };

      return Core.query('stock_ref',command);
    });
  };

  Stocks.update = function(rows) {
    var command = {
      "proc_info":{
        "proc_division":"U",       //U (Update) is fixed for Stocks. (Delete is prohibited)
        "proc_detail_division":"1" //1 : Absolute / 0 : Relative
      },
      "data":[{
        "table_name":"Stock",
        "rows":rows
      }]
    };

    return Core.query('stock_upd',command);
  };

  _.extend(SmaRegi, Stocks);

  // SmaRegi.Stores
  // ---------------
  var Stores = SmaRegi.Stores = {};

  Stores.fetch = function(page) {
    var command = {
      "limit":SmaRegi.INC_LIMIT,
      "page":page,
      "table_name":"Store"
    };

    return Core.query('store_ref',command);
  };

  //
  // Fetch All products data
  //
  Stores.fetchAll = function() {
    return Core.fetchAll(function(page) {
      var command = {
        "limit":SmaRegi.INC_LIMIT,
        "table_name":"Store"
      };

      return Core.query('store_ref',command);
    });
  };

  //
  // Fetch All Store data
  // Store IDs are keys of this map object.
  //
  Stores.getNameMap = function() {
    var data = [];
    var each_func = function(result) {
      data[result.storeId] = JSON.stringify(result);
    };

    var o = Core.fetchAll(Stores.fetch,each_func);

    if(o.error_code) {
      Logger.log(o);
      throw "Can't get store data";
    }

    return data;
  };

  _.extend(SmaRegi, Stores);

  // SmaRegi.Category
  // ---------------
  var Category = SmaRegi.Category = {};

  //
  // Fetch All category
  //
  Category.fetchAll = function() {
    return Core.fetchAll(function(page) {
      var command = {
        "limit":SmaRegi.INC_LIMIT,
        "table_name":"Category"
      };

      return Core.query('category_ref',command);
    });
  };

  Category.fetch = function(page) {
    var command = {
      "limit":SmaRegi.INC_LIMIT,
      "page":page,
      "table_name":"Category"
    };

    return Core.query('category_ref',command);
  };

  //
  // Fetch All category data
  // category IDs are keys of this map object.
  //
  Category.getNameMap = function() {
    var data = [];
    var each_func = function(result) {
      data[result.categoryId] = JSON.stringify(result);
    };

    var o = Core.fetchAll(Category.fetch,each_func);

    if(o.error_code) {
      Logger.log(o);
      throw "Can't get category data";
    }

    return data;
  };

  _.extend(SmaRegi, Category);

  // SmaRegi.Category
  // ---------------
  var DailySum = SmaRegi.DailySum = {};

  //Inquirely max limit for Daily sum
  SmaRegi.DailySum.INC_LIMIT = 100;

  //
  // Fetch All Daily Sum
  //
  DailySum.fetchAll = function(storeId) {
    return Core.fetchAll(function(page) {
      var command = {
        "limit":SmaRegi.DailySum.INC_LIMIT,
        "conditions":[{"storeId":storeId}],
        "order":["sumDate desc"],
        "table_name":"DailySum"
      };

      return Core.query('daily_sum_ref',command);
    });
  };

  _.extend(SmaRegi, DailySum);

  return SmaRegi;
}));
