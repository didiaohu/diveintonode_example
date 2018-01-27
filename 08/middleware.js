var url = require('url');
var routes = {'all':[]};
var app = {};

// 中间件
var querystring = function(req, res, next){
	req.query = url.parse(req.url, true).query;
	console.log("执行中间件querystring");
	next();
}

var cookie = function(req, res, next){
	var cookie = req.headers.cookie;
	var cookies = {};
	if(cookie){
		var list = cookie.split(';');
		for(var i = 0; i < list.length; i++){
			var pair = list[i].split('=');
			cookies[pair[0].trim()] = pair[1];
		}
	}
	req.cookies = cookies;
	console.log("执行中间件cookie");
	next();
}

var pathRegexp = function(path){
	var keys = [];
	var strict = false;
	path = path
		.concat(strict ? '' : '/?')
		.replace(/\/\(/g, '(?:/')
		.replace( /(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?(\*)?/g, function(_, slash, format, key, capture, optional, star){
			keys.push(key);
			slash = slash || '';
			return ''
				+ (optional ? '' : slash)
				+ '(?:'
				+ (optional ? slash : '')
				+ (format || '') + (capture || (format && '([^/.]+?)' || '([^/.]+?)' )) + ')'
				+ (optional || '')
				+ (star ? '(/*)?' : '');
		})
		.replace(/([\/.])/g, '\\$1')
		.replace(/\*/g, '(.*)');

	return {
		keys: keys,
		regexp: new RegExp('^' + path + '$')
	};	
}

app.use = function(path){
	var handle;
	if(typeof path === 'string'){
		handle = {
			path: pathRegexp(path),
			stack: Array.prototype.slice.call(arguments, 1)
		};
	}else{
		handle = {
			path: pathRegexp('/'),
			stack: Array.prototype.slice.call(arguments, 0)
		}
	}
	
	routes.all.push(handle);
};

var match = function (pathname, routes){
	var stacks = [];
	for(var i = 0; i < routes.length; i++){
		var route = routes[i];
		var reg = route.path.regexp;
		var matched = reg.exec(pathname);
		if(matched){
			stacks = stacks.concat(route.stack);
		}
	}
	return stacks;
}


var handle = function(req, res, stack){
	var next = function(){
		var middleware = stack.shift();
		if(middleware){
			middleware(req, res, next);
		}
	}
	next();
}

function init(req, res){
	var pathname = url.parse(req.url).pathname;

	var method = req.method.toLowerCase();

	var stacks = match(pathname, routes.all);

	handle(req, res, stacks);
}

// 匹配路由的中间件，提高使用中间件性能
app.use('/user/:username', querystring);
app.use('/user/:username',cookie);

var http = require('http');
http.createServer(init).listen(1337, '127.0.0.1');