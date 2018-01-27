var url = require('url');
var routes = {'all':[]};
var app = {};

var querystring = function(req, res, next){
	req.query = url.parse(req.url, true).query;
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

	if(routes.hasOwnProperty(method)){
		stacks.concat(match(pathname, routes[method]));
	}

	if(stacks.length){
		handle(req, res, stacks);
	}else{
		handle404(req, res);
	}
}

var getUser = function(){
	console.log("I am a action");
}
var arr = ['get', 'put', 'delete', 'post'];
arr.forEach( function(method){
	routes[method] = [];
	app[method] = function(path, action){
		routes[method].push([pathRegexp(path), action])
	}
});

app.use('/user', querystring);
app.use(cookie);
app.get('/user/:username', getUser);



var http = require('http');
http.createServer(init).listen(1337, '127.0.0.1');