/* (c) 2005-2011 masatoshi teruya, all rights reserved. */

// MARK: kontext
var kontext = {};

kontext.def = {
	body: function(){ return document.getElementsByTagName('body').item(0); },
	maxNum: 1 << 24
};

// MARK: Point
kontext.point = {};
kontext.point.getCursor = function( evt )
{
	if( evt.pageX ){
		return { x:evt.pageX, y:evt.pageY };
	}
	else {
		var scroll = kontext.util.getDocumentScroll();
		return {
			x: scroll.x + evt.clientX,
			y: scroll.y + evt.clientY
		};
	}
};
// hit test by point
kontext.point.hitTest = function( pt, elm )
{
	if( elm )
	{
		var rect = kontext.elm.getRect( elm );
		
		if( pt.x > rect.left && pt.x < rect.right && pt.y > rect.top && pt.y < rect.bottom ){
			return rect;
		}
	}
	
	return undefined;
};
kontext.point.trackMouse = function( origin, cbMove, cbUp, args )
{
	// delegate mouseMove/drag
	var mev = {
		move: function( evt )
		{
			if( kontext.isFunction( cbMove ) ){
				cbMove( evt, origin, args );
			}
			kontext.ev.stop( evt );
		},
		// delegate mouseUp
		up: function( evt )
		{
			kontext.ev.removeListener( document, 'mousemove', mev.move, false );
			kontext.ev.removeListener( document, 'mouseup', mev.up, false );
			kontext.ev.removeListener( document, 'selectstart', mev.select, false );
			if( kontext.isFunction( cbUp ) ){
				cbUp( evt, origin, args );
			}
			kontext.ev.stop( evt );
		},
		// delegate selectStart -> mouseSelect
		select: function( evt ){
			return kontext.ev.stop( evt );
		}
	};
	
	kontext.ev.addListener( document, 'mousemove', mev.move, false );
	kontext.ev.addListener( document, 'mouseup', mev.up, false );
	kontext.ev.addListener( document, 'selectstart', mev.select, false );
};

// MARK: Rect
kontext.Rect = function()
{
	var padding = 0,
		retouch = function(){
			this.right = this.left + this.width;
			this.bottom = this.top + this.height;
			this.center.x = ( this.width > 0 ) ? ( this.width/2 + this.left ) : 0;
			this.center.y = ( this.height > 0 ) ? ( this.height/2 + this.top ) : 0;
		};
	
	this.left = ( kontext.isNumber( arguments[0] ) ) ? arguments[0] : 0;
	this.top = ( kontext.isNumber( arguments[1] ) ) ? arguments[1] : 0;
	this.width = ( kontext.isNumber( arguments[2] ) && arguments[2] > 0 ) ? arguments[2] : 0;
	this.height = ( kontext.isNumber( arguments[3] ) && arguments[3] > 0 ) ? arguments[3] : 0;
	this.right = 0
	this.bottom = 0;
	this.center = {};
	
	this.setPadding = function( pad )
	{
		if( kontext.isNumber( pad ) && pad >= 0 )
		{
			this.left += padding;
			this.top += padding;
			retouch.apply( this );
			padding = Math.abs( pad );
			this.left += -padding;
			this.top += -padding;
			this.right += padding;
			this.bottom += padding;
			this.center.x += padding;
			this.center.y += padding;
		}
	};
	this.isInto = function( x, y )
	{
		return ( x >= this.left && x <= this.right && 
				 y >= this.top && y <= this.bottom );
	};
	
	retouch.apply( this );
};

// MARK: utility methods
kontext.util = {};
kontext.util.getDocumentScroll = function( doc )
{
	var scroll = undefined;
	
	if( !doc ){
		doc = document;
	}
	
	if( doc.body ){
		scroll = { 
			x:doc.body.scrollLeft, 
			y:doc.body.scrollTop,
			width:doc.body.scrollWidth,
			height:doc.body.scrollHeight
		};
	}
	else if( doc.documentElement ){
		scroll = { 
			x:doc.documentElement.scrollLeft, 
			y:doc.documentElement.scrollTop,
			width:doc.documentElement.scrollWidth,
			height:doc.documentElement.scrollHeight
		};
	}
	
	return scroll;
};

kontext.util.strTok = function( str )
{
	var hash = {};
	
	if( str )
	{
		var args = str.split( /;/ );
	
		if( args )
		{
			var arg;
			while( ( arg = args.shift() ) )
			{
				arg = arg.split(':',2);
				if( arg.length === 2 ){
					hash[arg[0].replace(/(^\s+|\s+$)/,'')] = arg[1].replace(/(^\s+|\s+$)/,'');
				}
			}
		}
	}
	
	return hash;
};

kontext.util.trackValue = function( origin, dest, msec, task, smooth, ctx )
{
	if( origin === dest ){
		task( dest, true, ctx );
	}
	else
	{
		var countUp = ( origin < dest ),
			interval = setInterval( function()
			{
				var last = false;
				
				if( ( countUp ) ? ( origin < dest ) : ( origin > dest ) )
				{
					var diff = origin - dest,
						val = ( !diff || !smooth ) ? ( ( diff > 0 ) ? 1 : -1 ) : ( diff/smooth );
					
					val = ( Math.abs( val ) < 0.01 ) ? ( ( ( diff > 0 ) ? 0.01 : -0.01 ) ) : val;
					origin -= val;
					last = ( countUp ) ? ( origin >= dest ) : ( origin <= dest );
				}
				else {
					last = true;
				}
				
				if( last ){
					clearInterval( interval );
					task( dest, true, ctx );
				}
				else if( task( origin, false, ctx ) ){
					clearInterval( interval );
					task( dest, true, ctx );
				}
				
			}, msec );
	}
};



// MARK: event methods
// MARK: public
kontext.ev = {};
kontext.ev.addListener = function( elm, type, func, useCapture )
{
	if( elm.addEventListener ){
		elm.addEventListener( type, func, useCapture );
	}
	else {
		elm.attachEvent( 'on'+type, func );
	}
};
kontext.ev.removeListener = function( elm, type, func, useCapture )
{
	if( elm.removeEventListener ){
		elm.removeEventListener( type, func, useCapture );
	}
	else {
		elm.detachEvent( 'on'+type, func );
	}
};
kontext.ev.add = function( elm, type, func, useCapture, delegate, args )
{
	var ctx = {
			type: type,
			elm: elm,
			func: func,
			useCapture: useCapture,
			delegate: delegate,
			args: args
		};
	
	// define context if undefined
	if( !elm.ktx || !( elm.ktx instanceof Object ) ){
		elm.ktx = { evt:{} };
	}
	// define context.event if undefined
	else if( !elm.ktx.evt || !( elm.ktx.evt instanceof Object ) ){
		elm.ktx.evt = {};
	}
	// remove cuurent event context if defined
	else if( elm.ktx.evt[type] ){
		kontext.ev.remove( elm, type, null, null )
	}
	
	// add listeners hash
	elm.ktx.evt[type] = {
		ctx: ctx,
		preflight: function()
		{
			var evt = arguments[0] || window.event,
				elm = evt.target,
				msg = "kontext.js: could not invoke event '" + evt.type + "'";
			
			// context undefined
			if( !ctx ){
				console.log( [msg,"reason: context undefined"].join("\n") );
			}
			// delegate undefined
			else if( !ctx.delegate || typeof ctx.delegate !== 'object' )
			{
				// func is not typeof function
				if( !kontext.isFunction( ctx.func ) ){
					console.log( [msg,"reason: function undefined"].join("\n") );
				}
				// call function
				else {
					return ctx.func.apply( this, [evt,ctx] );
				}
			}
			// func undefined
			else if( !ctx.func ){
				console.log( [msg,"reason: function undefined"].join("\n") );
			}
			// func is string
			else if( kontext.isString( ctx.func ) )
			{
				// delegate.func undefined
				if( !kontext.isFunction( ctx.delegate[ctx.func] ) ){
					console.log( [msg,"reason: delegate method '" + ctx.func + "' undefined"].join("\n") );
				}
				// call delegate method
				else {
					return ctx.delegate[ctx.func]( evt, ctx );
				}
			}
			// func is function
			else if( kontext.isFunction( ctx.func ) ){
				// call method apply delegate
				return ctx.func.apply( ctx.delegate, [evt,ctx] );
			}
			// invalid func
			else {
				console.log( [msg,"reason: invalid function type"].join("\n") );
			}
			return kontext.ev.stop( evt );
		}
	};
	
	kontext.ev.addListener( elm, type, elm.ktx.evt[type].preflight, useCapture );
};

kontext.ev.remove = function( elm, type, func, useCapture )
{
	if( kontext.isFunction( func ) ){
		kontext.ev.removeListener( elm, type, func, useCapture );
	}
	else
	{
		var evt = ( elm.ktx && elm.ktx.evt ) ? elm.ktx.evt : undefined;
		
		if( evt )
		{
			if( type )
			{
				if( evt[type] ){
					kontext.ev.removeListener( elm, type, evt[type].preflight, evt[type].ctx.useCapture );
					delete evt[type];
				}
			}
			else
			{
				for( type in evt ){
					kontext.ev.removeListener( elm, type, evt[type].preflight, evt[type].ctx.useCapture );
					delete evt[type];
				}
			}
		}
	}
};

kontext.ev.stop = function( evt )
{
	if( evt.stopPropagation ){
		evt.stopPropagation();
	}
	if( evt.preventDefault ){
		evt.preventDefault();
	}
	evt.returnValue = false;
	return false;
};


// MARK: Elements
kontext.elm = {};
kontext.elm.isBlockLevel = function( elm, onself )
{
	var rc = 0;
	
	if( kontext.isNodeElement( elm ) )
	{
		var tag = elm.nodeName.toLowerCase(),
			block = /^(body|blockquote|form|noframe|script|noscript|div|fieldset|address|h[1-6]|p|pre|[uod]l|li|dt|dd|table|thead|tfoot|tbody|tr|th|td|hr)$/,
			oneself = /^(div|address|h[1-6]|p|pre)$/
	
		if( ( rc += block.test( tag ) ) ){
			rc += oneself.test( tag );
		}
	}
	
	return rc;
};
kontext.elm.getDocument = function( elm, innerDocument )
{
	var doc = undefined;
	
	if( elm )
	{
		doc = elm.ownerDocument;
		if( innerDocument )
		{
			if( elm.contentDocument ){
				doc = elm.contentDocument;
			}
			else if( elm.contentWindow ){
				doc = elm.contentWindow.document;
			}
		}
	}
	
	return doc;
};

kontext.elm.getRect = function( elm, padding )
{
	var pad = ( kontext.isNumber( padding ) ) ? padding : 0,
		rect = new kontext.Rect(),
		parent = elm;
		
	rect.left = elm.offsetLeft;
	rect.top = elm.offsetTop;
	rect.width = ( elm.offsetWidth > elm.clientWidth ) ? elm.offsetWidth : elm.clientWidth;
	rect.height = ( elm.offsetHeight > elm.clientHeight ) ? elm.offsetHeight : elm.clientHeight;
	parent = elm;
	while( ( parent = parent.offsetParent ) ){
		rect.left += parent.offsetLeft;
		rect.top += parent.offsetTop;
	}
	rect.setPadding( pad );
	return rect;
};

kontext.elm.insert = function( parent, elm, target, before )
{
	if( kontext.isNodeElement( parent ) && kontext.isNodeElement( elm ) )
	{
		if( target && kontext.isNodeElement( target.parentNode ) ){
			target.parentNode.insertBefore( elm, ( before ) ? target : target.nextSibling );
		}
		else {
			parent.insertBefore( elm, ( before ) ? target : target.nextSibling );
		}
	}
};

kontext.elm.replace = function( elm, target )
{
	if( kontext.isNodeElement( elm ) && kontext.isNodeElement( target ) && target.parentNode ){
		var parent = target.parentNode;
		parent.replaceChild( elm, target );
	}
};

kontext.elm.remove = function( elm )
{
	if( elm && elm.parentNode ){
		elm.parentNode.removeChild( elm );
	}
};

kontext.elm.removeChilds = function( elm )
{
	if( elm && elm.childNodes )
	{
		while( elm.firstChild ){
			elm.removeChild( elm.firstChild );
		}
	}
};
kontext.elm.sameParent = function( src, dest )
{
	return ( src && dest &&
			 src.parentNode && dest.parentNode &&
			 src.parentNode === dest.parentNode );
};


/* MARK: Interface
	Interface[type:val; method:val; cusor:val; useCapture:val; [args:val;]]
*/
kontext.Interface = function( app )
{
	// internal use
	var tagNames = [],
		items = [],
		extr = new RegExp( /\bInterface\[([^\]]+)]/ );
	
	// methods
	this.bind = function( elm, args )
	{
		if( args && args.type )
		{
			var delegate = app;
			
			if( args.delegate )
			{
				delegate = undefined;
				if( kontext.isFunction( app.getDelegate ) ){
					delegate = app.getDelegate( args.delegate );
				}
			}
			
			if( delegate && kontext.isFunction( delegate.constructor ) )
			{
				// useCapture
				args.useCapture = false;
				// cursor style
				if( args.cursor ){
					elm.style.cursor = args.cursor;
				}
				
				// add event
				kontext.ev.add( elm, args.type, args.method, args.useCapture, delegate, args );
				// save target elm
				items.push( elm );
			}
			else {
				console.log( 'failed to bind: unknown delegate' );
			}
		}
	};
	this.unbind = function( elm )
	{
		var new_item = [],
			item;
		
		while( ( item = this.items.shift() ) )
		{
			if( item !== elm ){
				new_item.push( item );
			}
		}
		delete this.items;
		this.items = new_item;
	};
	this.extract = function( elm )
	{
		var className = extr.exec( elm.className ),
			args = undefined;
		
		if( className && className.length === 2 ){
			args = kontext.util.strTok( className[1] );
		}
		
		// add event
		this.bind( elm, args );
	};
	this.enable = function( tags, from )
	{
		var doc = ( from && kontext.isFunction( from.getElementsByTagName ) ) ? from : document,
			elms,ntag,nelm,i,s;
		
		this.disable();
		if( kontext.isArray( tags ) ){
			tagNames = tags;
		}
		
		for( i = 0, ntag = tagNames.length; i < ntag; i++ )
		{
			if( kontext.isString( tagNames[i] ) )
			{
				elms = doc.getElementsByTagName( tagNames[i] );
				for( s = 0, nelm = elms.length; s < nelm; s++ ){
					this.extract( elms[s] );
				}
			}
		}
	};
	this.disable = function()
	{
		var elm;
		while( ( elm = items.shift() ) ){
			kontext.ev.remove( elm );
		}
	};
	
	if( !app || !kontext.isFunction( app.constructor ) ){
		console.log( 'failed to new kontext.Interface: unknown application' );
	}
};




/*
javascript:(
function(i){
	i.style.position='fixed';
	i.style.top='0%';
	i.onload=function(p){
		p=encodeURIComponent( prompt('postMessage','Hello,World!') );
		i.contentWindow.postMessage(p,'http://ss-o.net');
	};
	i.src='http://ss-o.net/xjs/postMessage.html';
	document.body.appendChild(i);
}
)(document.createElement('iframe'));
*/
// MARK: XML HTTP Request
kontext.Request = function( url, method, aQuery )
{
	// internal use
	var ctx = {},
		task = {};
		ntask = [];
		lock = false,
		sandbox = undefined,
		// use for iframe
		appendSandbox = function()
		{
			if( !sandbox )
			{
				sandbox = {
					div: document.createElement('div'),
					body: document.getElementsByTagName('body').item(0),
					form: document.createElement('form')
				};
				sandbox.form.style.display = 'none';
				sandbox.div.appendChild( sandbox.form );
				sandbox.div.style.position = 'fixed';
				sandbox.div.style.top = '0';
				sandbox.div.style.left = '-10000px';
				sandbox.div.style.opacity = 0;
				sandbox.body.appendChild( sandbox.div );
			}
		},
		submitViaSandbox = function( obj )
		{
			var query = obj.query;
			
			// cleanup form items
			kontext.elm.removeChilds( sandbox.form );
			// configure
			sandbox.form.target = 'kontext.Request.' + obj.id;
			sandbox.form.enctype = ( obj.enctype ) ? obj.enctype : 'application/x-www-form-urlencoded';
			sandbox.form.method = obj.method;
			sandbox.form.action = obj.url + ( ( obj.url.match( /\?/ ) ) ? '&amp;' : '?' ) + 'via=';
			sandbox.form.action += encodeURIComponent( document.location.href.split( '://', 2 )[0] + '://' + document.location.host );
			// append query
			for( var p in query ){
				var input = document.createElement('input');
				input.type = 'hidden';
				input.name = p;
				input.value = query[p];
				sandbox.form.appendChild(input);
			}
			// submit
			sandbox.form.submit();
		},
		receiveMessage = function()
		{
			console.log( 'receiveMessage' );
			/*
			if( obj.submit )
			{
				obj.document = ( this.contentDocument ) ? this.contentDocument : this.contentWindow;
				
				setTimeout( function(){
					var next = obj.delegate.apply( this, arguments );
					kontext.elm.remove( obj.inframe );
					invokeFinish( obj.id, next );
				}, 4000 );
			}
			*/
		},
		progress = function( evt, ctx )
		{
			console.log( 'progress' );
			// this.contentWindow.postMessage( 'hello world', '*' )
			window.postMessage( 'hello world', '*' );
		},
		readyForFrame = function( evt, ctx )
		{
			var obj = ctx.args;
			
			console.log( 'readyForFrame' );
			this.readyState = 0;
			// set charset to charset of destination
			this.contentDocument.charset = 'UTF-8';
			this.contentDocument.open();
			this.contentDocument.write('<body></body>');
			this.contentDocument.close();
			kontext.ev.remove( obj.frame );
			kontext.ev.remove( obj.frame );
			if( obj.delegate.apply( this, [evt,obj] ) ){
				// add events
				kontext.ev.add( obj.frame, 'load', progress, true, null, obj );
				kontext.ev.add( obj.frame, 'readystatechange', progress, true, null, obj );
				kontext.ev.add( window, 'message', receiveMessage, true, null, obj );
				submitViaSandbox( obj );
			}
			else {
				kontext.elm.remove( obj.frame );
				invokeFinish( obj.id, false );
			}
		},
		invokeByFrame = function( obj )
		{
			// setup frame
			obj.frame = document.createElement('iframe');
			obj.frame.id = obj.frame.name = 'kontext.Request.' + obj.id;
			obj.frame.src = 'about:blank';
			kontext.ev.add( obj.frame, 'load', readyForFrame, true, null, obj );
			kontext.ev.add( obj.frame, 'readystatechange', readyForFrame, true, null, obj );
			// create by manual
			sandbox.div.appendChild( obj.frame );
		},
		// use XMLHttpRequest
		readyForXHR = function()
		{
			var next = this.ctx.delegate.apply( this, arguments );
			if( this.readyState === 4 ){
				invokeFinish( this.ctx.id, next );
			}
		},
		invokeByXHR = function( obj )
		{
			var	url = obj.url + '?' + obj.id,
				query = [];
			
			// setup query
			for( var p in obj.query ){
				query.push( p + '=' + obj.query[p] );
			}
			
			// create request object, set callback
			obj.xhr = ( window.XMLHttpRequest ) ? new XMLHttpRequest : new ActiveXObject("Microsoft.XMLHTTP"),
			obj.xhr.ctx = obj;
			obj.xhr.onreadystatechange = readyForXHR;				
			if( obj.method === 'post' )
			{
				obj.xhr.open( obj.method, url, true );
				if( query.length ){
					query = query.join('&amp;');
				}
			}
			else
			{
				if( query.length ){
					query = '&amp;' + query.join('&amp;');
				}
				obj.xhr.open( obj.method, url + query, true );
				query = null;
			}
			
			// add headers
			for( var key in obj.header )
			{
				var val = obj.header[key];
				
				if( kontext.isString( val ) ){
					obj.xhr.setRequestHeader( key, val );
				}
				else if( val instanceof Array )
				{
					for( var i = 0; i < val.length; i++ )
					{
						if( kontext.isString( val[i] ) ){
							obj.xhr.setRequestHeader( key, val[i] );
						}
					}
				}
			}
			// obj.xhr.setRequestHeader( 'Content-Type', 'application/x-www-form-urlencoded' );
			obj.xhr.send( query );
		},
		invokeFinish = function( id, next )
		{
			delete task[id];
			lock = false;
			if( next ){
				invoke();
			}
		},
		invoke = function()
		{
			if( !lock && ntask.length )
			{
				var obj = ntask.shift();

				lock = true;
				if( obj.useSandbox ){
					invokeByFrame( obj );
				}
				else{
					invokeByXHR( obj );
				}
			}
		};
	
	// MARK: public methods
	this.ntask = function(){
		return ntask.length + ( ( lock ) ? 1 : 0 );
	};
	this.create = function( method, url, query, header )
	{
		var id = +(new Date());
		
		ctx[id] = {
			id: id,
			method: undefined,
			url: undefined,
			header:{},
			query: {}
		};
		// initialize by args
		this.setMethod( id, method );
		this.setURL( id, url );
		this.setQuery( id, query );
		if( header instanceof Object )
		{
			for( var p in header ){
				 this.setHeader( id, p, header[p] );
			}
		}
		
		return id;
	};
	this.remove = function( id )
	{
		if( ctx[id] ){
			delete ctx[id];
		}
	};
	this.setMethod = function( id, method )
	{
		if( method && ctx[id] ){
			ctx[id].method = method.toLowerCase();
		}
	};
	this.setURL = function( id, url )
	{
		if( url && ctx[id] ){
			ctx[id].url = url;
		}
	};
	this.setHeader = function( id, key, val, overwrite )
	{
		var obj = ctx[id];
		
		if( obj )
		{
			if( !obj.header[key] || overwrite )
			{
				if( kontext.isString( val ) || kontext.isArray( val ) ){
					obj.header[key] = val;
				}
			}
			else if( !kontext.isArray( obj.header[key] ) ){
				var tmp = obj.header[key];
				obj.header[key] = [tmp];
			}
			else {
				obj.header[key].push( val );
			}
		}
	};
	this.setQuery = function( id, query )
	{
		if( query instanceof Object && ctx[id] )
		{
			var obj = ctx[id];
			
			for( var p in query )
			{
				var val = query[p];
				if( kontext.isNumber( val ) ){
					obj.query[p] = '' + val;
				}
				else if( kontext.isBool( val ) ){
					obj.query[p] = ( val ) ? 1 : 0;
				}
				else if( kontext.isString( val ) ){
					obj.query[p] = val;
				}
			}
		}
	};
	this.send = function( id, delegate, useSandbox )
	{
		var obj = ctx[id];
		if( obj )
		{
			obj.delegate = delegate;
			if( useSandbox === true ){
				obj.useSandbox = true;
				appendSandbox();
			}
			
			delete ctx[id];
			task[id] = obj;
			ntask.push( obj );
			invoke();
		}
	};
};



// MARK: checker
kontext.isBool = function( arg ){
	return ( typeof arg === 'boolean' );
};
kontext.isNumber = function( arg ){
	return ( typeof arg === 'number' );
};
kontext.isString = function( arg ){
	return ( typeof arg === 'string' );
};
kontext.isFunction = function( arg ){
	return ( arg && typeof arg === 'function' );
};
kontext.isObject = function( arg ){
	return ( arg && arg.constructor === Object );
};
kontext.isArray = function( arg ){
	return ( arg && arg.constructor === Array );
};
kontext.isRegExp = function( arg ){
	return ( arg && arg.constructor === RegExp );
};
kontext.isNodeElement = function( arg ){
	return ( arg && arg.nodeType === Node.ELEMENT_NODE );
};
kontext.isNodeAttribute = function( arg ){
	return ( arg && arg.nodeType === Node.ATTRIBUTE_NODE );
};
kontext.isNodeText = function( arg ){
	return ( arg && arg.nodeType === Node.TEXT_NODE );
};



// MARK: still working

// MARK: QuadTree
kontext.QuadTree = {};
kontext.QuadTree.Tree = function()
{
		// default depth size = 8
	var maxDepth = 9,
		// spatial nodes hash index
		nodes = {},
		// number of node index
		depth_of_nodes = undefined,
		bounds = {
			// depth
			depth:0,
			// max node size
			maxNodeSize:0,
			// origin pt(left,top)
			x:0, y:0,
			// max size
			w:0, h:0,
			// min size
			mw:0, mh:0
		},
		// init total number of cell each depth
		initNodeSize = function( depth )
		{
			if( kontext.isNumber( depth ) ){
				depth = ( depth < 1 && depth > maxDepth ) ? 8 : +depth;
			}
			else {
				depth = 6;
			}
			
			depth_of_nodes = [1];
			for( var i = 1; i < maxDepth + 2; i++ ){
				depth_of_nodes[i] = ( depth_of_nodes[i-1]*4 );
			}
			for( var i = 1; i < maxDepth + 2; i++ ){
				depth_of_nodes[i] = ( depth_of_nodes[i] - 1 ) / 3;
			}
			// set default depth
			this.setDepth( depth );
		},
		bitSeparate = function( n ){
			v = ( n | ( n << 8 ) ) & 0x00ff00ff;
			v = ( n | ( n << 4 ) ) & 0x0f0f0f0f;
			v = ( n | ( n << 2 ) ) & 0x33333333;
			return ( n | ( n << 1 ) ) & 0x55555555;
		},
		// 射影変換 -> ビット分割 -> モートン空間番号
		getMortonNumber = function( x, y )
		{
			var bitX = bitSeparate( ( x - bounds.x ) / bounds.mw ),
				bitY = bitSeparate( ( y - bounds.y ) / bounds.mh );
			
			return ( bitX | ( bitY << 1 ) );
		},
		getNodeIdxAt = function( x, y, width, height )
		{
			// index number of node
			var idx = 0xffffffff;
			
			if( width >= 0 && height >= 0 )
			{
				// get morton number left:top and right:bottom
				var lt = getMortonNumber( x, y ),
					rb = getMortonNumber( x + width, y + height );
				
				if( lt < bounds.maxNodeSize && rb < bounds.maxNodeSize )
				{
						// spatial section
					var sec = rb ^ lt,
						// spatial division
						nshift = 0;
					
					// find node index number
					for( var i = 0; i < bounds.depth; i++ )
					{
						if( ( ( sec >> ( i * 2 ) ) & 0x3 ) !== 0 ){
							nshift = i + 1;
						}
					}
					idx = rb >> ( nshift * 2 );
					idx += depth_of_nodes[bounds.depth - nshift];
					console.log( 'lt:' + lt + ' -> ' + lt.toString(2) + ', rb:' + rb + ' -> ' + rb.toString(2) + ', sec:' + sec + ' -> ' + sec.toString(2) );
					console.log( rb.toString(2) + ' >> ' + nshift * 2 + ' = ' + ( rb >> ( nshift * 2 ) ) + ':' + ( rb >> ( nshift * 2 ) ).toString(2) );
					
					if( idx >= bounds.maxNodeSize ){
						idx = 0xffffffff;
					}
				}
			}
			
			return idx;
		},
		getNodeAt = function( x, y, width, height ){
			var idx = getNodeIdxAt( x, y, width, height );
			return ( idx < bounds.maxNodeSize ) ? nodes[''+idx] : undefined;
		};
	
	// set node depth
	this.setDepth = function( depth )
	{
		if( depth < 1 && depth > maxDepth ){
			console.log( 'invalid depth' );
		}
		else {
			bounds.depth = depth;
			bounds.maxNodeSize = depth_of_nodes[depth+1];
			return true;
		}
		return false;
	};
	// set bounds
	this.setBounds = function( x, y, width, height )
	{
		if( width < 1 && height < 1 ){
			console.log( 'invalid width or height value' );
		}
		else {
			var div = 1 << bounds.depth;
			bounds.x = x;
			bounds.y = y;
			bounds.w = width;
			bounds.h = height;
			bounds.mw = width / div;
			bounds.mh = height / div;
			return true;
		}
		return false;
	};
	this.getLastLeafAt = function( x, y, width, height ){
		var node = getNodeAt( x, y, width, height );
		return ( node ) ? node.getLastLeaf() : undefined;
	};
	// attach leaf
	this.attach = function( leaf )
	{
		var idx = 0;
		console.log( 'attach: ' + leaf.x() + ':' + leaf.y() + ':' + leaf.width() + ':' + leaf.height() );
		if( ( idx = getNodeIdxAt( leaf.x(), leaf.y(), leaf.width(), leaf.height() ) ) < bounds.maxNodeSize )
		{
			// create hash key
			var key = '' + idx;
			// create node if undefined
			if( nodes[key] || ( nodes[key] = new kontext.QuadTree.Node( this, idx ) ) ){
				return nodes[key].attach( leaf );
			}
		}
		
		return false;
	};
	// intialize depth of node size
	initNodeSize.apply( this, arguments );
};

kontext.QuadTree.isTree = function( tree ){
	return ( tree && tree.constructor === kontext.QuadTree.Tree );
};

// MARK: QuadTree.Node
kontext.QuadTree.Node = function()
{
	var tree = arguments[0],
		idx = arguments[1],
		lastLeaf = undefined;
	
	this.getTree = function(){
		return tree;
	};
	this.getIdx = function(){
		return idx;
	};
	this.getLastLeaf = function(){
		return lastLeaf;
	};
	this.attach = function( leaf )
	{
		if( leaf.node !== this )
		{
			leaf.detach();
			if( lastLeaf ){
				leaf.node = this;
				leaf.prev = lastLeaf;
				lastLeaf.next = leaf;
				lastLeaf = leaf;
			}
			else {
				leaf.node = this;
				lastLeaf = leaf;
			}
			return true;
		}
		return false;
	};
	// call from leaf
	this.onDetach = function( leaf )
	{
		if( leaf === lastLeaf && leaf.prev ){
			lastLeaf = leaf.prev;
		}
	};
	
	// check tree and node number
	if( ( !tree || tree.constructor !== kontext.QuadTree.Tree ) ||
		( idx && !kontext.isNumber( idx ) ) ){
		console.log( 'invalid arguments' );
		return undefined;
	}
	
	return this;
};
kontext.QuadTree.isNode = function( node ){
	return ( node && node.constructor === kontext.QuadTree.Node );
};

// MARK: QuadTree.Leaf
kontext.QuadTree.Leaf = function()
{
	// public: properties
	// node
	this.node = undefined;
	// prev leaf
	this.prev = undefined;
	// next leaf
	this.next = undefined;
	
	// private: properties and methods
	var obj = {
			x:arguments[0],
			y:arguments[1],
			width:arguments[2],
			height:arguments[3],
			// user data
			data:arguments[4]
		},
		// update self position
		retouch = function()
		{
			if( this.node )
			{
				var tree = this.node.getTree();
				this.detach( this );
				if( tree ){
					tree.attach( this );
				}
			}
		};
	
	// public: methods
	this.detach = function()
	{
		if( this.node )
		{
			if( this.prev ){
				this.prev.next = this.next;
			}
			if( this.next ){
				this.next.prev = this.prev;
			}
			this.node.onDetach( this );
			this.node = undefined;
			this.prev = undefined;
			this.next = undefined;
			return true;
		}
		return false;
	};
	// add getter
	this.x = function(){
		return obj.x;
	};
	this.y = function(){
		return obj.y;
	};
	this.width = function(){
		return obj.width;
	};
	this.height = function(){
		return obj.height;
	};
	this.data = function(){
		return obj.data;
	};
	this.update = function( x, y, width, height, data )
	{
		var len = arguments.length;
		if( len )
		{
			obj.x = x;
			if( len > 1 ){
				obj.y = y;
			}
			if( len > 2 ){
				obj.width = width;
			}
			if( len > 3 ){
				obj.height = height;
			}
			if( len > 4 ){
				obj.data = data;
			}
		}
		retouch.apply( this );
	};
};
// check leaf type
kontext.QuadTree.isLeaf = function( leaf ){
	return ( leaf && leaf.constructor === kontext.QuadTree.Leaf );
};


// MARK: Head Up Display Panel
kontext.HUD = function()
{
	var palette = document.createElement('div'),
		mouseCtx = new kontext.DragDrop( this, palette, true ),
		css = {
			display: 'block',
			position: 'fixed',
			top: 0,
			left: 0,
			width: '200px',
			height: '200px',
			backgroundColor: '#000',
			opacity: 0.8,
			zIndex: 65536
		};
	
	this.body = document.getElementsByTagName('body').item(0);
	for( var p in css ){
		palette.style[p] = css[p];
	}
	this.body.appendChild( palette );
	
	// MARK: methods
	this.show = function(){
		palette.style.display = 'block';
	};
	this.hide = function(){
		palette.style.display = 'hidden';
	};
	this.contents = function( contents ){
		palette.innerHTML = contents;
	};
	// MARK: delegate
	// mouseselect
	this.mouseSelect = function( evt ){
		return kontext.ev.stop( evt );
	};
	// mouseclick
	this.mouseClick = function( evt ){
		return kontext.ev.stop( evt );
	};
	// mouseup
	this.mouseUp = function( evt ){
		return kontext.ev.stop( evt );
	};
	// mouseover
	this.mouseOver = function( evt ){
		return kontext.ev.stop( evt );
	};
	// mouseout
	this.mouseOut = function( evt ){
		return kontext.ev.stop( evt );
	};
	// mousedown
	this.mouseDown = function( evt )
	{
		if( palette === evt.target ){
			mouseCtx.dragStart( evt, palette, 0 );
		}
		return kontext.ev.stop( evt );
	};
	// drag progress
	this.dragProgress = function( evt, elm, point ){
		return true;
	};
	// drag end
	this.dragEnd = function( evt, elm ){
		console.log( 'drag end' );
	};
	
};


// MARK: DragDrop
kontext.DragDrop = function( delegate, target, useCapture )
{
	this.ondrag = false;
	this.drag = null;
	this.dragRect = null;
	this.mousePt = {};
	this.delegate = delegate;
	
	// internal use
		// delegate selectStart -> mouseSelect
	var evSelectStart = function( evt )
		{
			if( this.delegate.mouseSelect ){
				return this.delegate.mouseSelect.apply( this.delegate, arguments );
			}
			return kontext.ev.stop( evt );
		},
		// delegate mouseClick
		evMouseClick = function( evt )
		{
			if( this.delegate.mouseClick ){
				return this.delegate.mouseClick.apply( this.delegate, arguments );
			}
			return kontext.ev.stop( evt );
		},
		// delegate mouseOver
		evMouseOver = function( evt )
		{
			if( !this.ondrag && this.delegate.mouseOver ){
				return this.delegate.mouseOver.apply( this.delegate, arguments );
			}
			return kontext.ev.stop( evt );
		},
		// delegate mouseOut
		evMouseOut = function( evt )
		{
			if( !this.ondrag && this.delegate.mouseOut ){
				return this.delegate.mouseOut.apply( this.delegate, arguments );
			}
			return kontext.ev.stop( evt );
		},
		// delegate mouseDown
		evMouseDown = function( evt )
		{
			if( this.delegate.mouseDown ){
				return this.delegate.mouseDown.apply( this.delegate, arguments );
			}
			return kontext.ev.stop( evt );
		},
		// delegate mouseMove/drag
		evMouseMove = function( evt )
		{
			if( this.ondrag )
			{
				// new position
				var point = {
						x: this.dragRect.xt - ( this.mousePt.x - evt.pageX ),
						y: this.dragRect.yt - ( this.mousePt.y - evt.pageY )
					};
				
				// set element position if delegate return true
				if( this.delegate.dragProgress( evt, this.drag, point ) ){
					this.drag.style.left = point.x + 'px';
					this.drag.style.top = point.y + 'px';
				}
			}
			else if( this.delegate.mouseMove ){
				return this.delegate.mouseMove.apply( this.delegate, arguments );
			}
			return kontext.ev.stop( evt );
		},
		// delegate mouseUp/dragEnd
		evMouseUp = function( evt )
		{
			if( this.ondrag )
			{
				this.ondrag = false;
				if( this.delegate.dragEnd ){
					this.delegate.dragEnd( arguments[0], this.drag );
				}
				return kontext.ev.stop( arguments[0] );
			}
			else if( this.delegate.mouseUp ){
				return this.delegate.mouseUp.apply( this.delegate, arguments );
			}
			return kontext.ev.stop( evt );
		};
	
	// MARK: events
	// drag
	this.dragStart = function( evt, elm, padding )
	{
		// set dragger properties
		this.ondrag = true;
		this.dragRect = kontext.elm.getRect( elm, padding );
		this.mousePt = { x:evt.pageX, y:evt.pageY };
		this.drag = elm;
	};
	
	// add event
	kontext.ev.add( target, 'selectstart', evSelectStart, useCapture, this );
	kontext.ev.add( target, 'click', evMouseClick, useCapture, this );
	kontext.ev.add( target, 'mouseover', evMouseOver, useCapture, this );
	kontext.ev.add( target, 'mouseout', evMouseOut, useCapture, this );
	kontext.ev.add( target, 'mousedown', evMouseDown, useCapture, this );
	kontext.ev.add( document, 'mousemove', evMouseMove, true, this );
	kontext.ev.add( document, 'mouseup', evMouseUp, true, this );
};

// MARK: Selection
kontext.Selection = function()
{
	var owner = undefined,
		sel = undefined,
		range = undefined,
		current = undefined;
	
	this.parse = function( elm )
	{
		var rc = false;
		
		owner = undefined;
		current = undefined;
		if( range ){
			range.detach();
			range = undefined;
		}
		
		if( elm && elm.ownerDocument && 
			elm.ownerDocument.defaultView && 
			elm.ownerDocument.defaultView.getSelection &&
			( sel = elm.ownerDocument.defaultView.getSelection() ) &&
			sel.focusNode )
		{
			rc = true;
			owner = elm;
			range = sel.getRangeAt(0);
		}
		
		return rc;
	};
	this.commonAncestorContainer = function(){
		return ( range ) ? range.commonAncestorContainer : undefined;
	};
	this.rewind = function( shouldElm )
	{
		if( shouldElm )
		{
			current = this.firstNode( shouldElm );
			if( current ){
				range.setStart( current );
			}
		}
		else {
			current = this.firstNode();
		}
		
		return current;
	};
	this.firstNode = function( shouldElm )
	{
		var node = ( range ) ? range.startContainer : undefined;
		
		if( node && shouldElm && !kontext.isNodeElement( node ) ){
			node = node.parentNode;
		}
		
		return node 
	};
	this.lastNode = function( shouldElm )
	{
		var node = ( range ) ? range.endContainer : undefined;
		
		if( node && shouldElm && !kontext.isNodeElement( node ) ){
			node = node.parentNode;
		}
		
		return node 
	};
	this.nextNode = function( shouldElm )
	{
		var node = undefined;
		
		if( current )
		{
			var last = this.lastNode( shouldElm ),
				lastRange = document.createRange(),
				nodeRange = document.createRange();
			
			// lastRange.selectNode( last );
			nodeRange.selectNode( current );
			console.log( nodeRange );
			// console.log( lastRange );
			
			if( current === last ){
				current = undefined;
				node = last;
			}
			else
			{
				node = current;
			
				while( node )
				{
					if( node.hasChildNodes() ){
						node = node.firstChild;
					}
					else if( node.nextSibling ){
						node = node.nextSibling;
					}
					else
					{
						while( ( node = node.parentNode ) )
						{
							if( node.nextSibling ){
								node = node.nextSibling;
								break;
							}
						}
					}
					
					if( node )
					{
						current = ( node === last ) ? undefined : node;
						if( current && shouldElm && !kontext.isNodeElement( current ) ){
							continue;
						}
						break;
					}
				}
			}
			lastRange.detach();
		}
		
		return node;
	};
	this.setStart = function(){
		console.log( sel );
//		range.setStart( owner, 0 );
	};
	this.collapse = function( bool )
	{
		if( range ){
			range.collapse( bool );
		}
	};
	this.cloneContents = function()
	{
		return ( range ) ? range.cloneContents() : undefined;
	};
	this.extractContents = function()
	{
		var extr = undefined;
		
		if( range ){
			var clone = range.cloneRange();
			extr = clone.extractContents();
			current = this.firstNode();
		}
		return extr;
	};
	this.insertNode = function( node )
	{
		if( range )
		{
			range.insertNode( node );
		}
	};
	this.surroundContents = function( callback )
	{
		if( range )
		{
			var node = this.rewind();
			
			if( node )
			{
				do {
					callback( node );
				} while( ( node = this.nextNode() ) );
			}
			/*
			if( this.firstNode() === this.lastNode() ){
				console.log( 'carret' );
				console.log( this.firstNode().constructor );
			}
			else
			{
				var extr = range.cloneContents();
				console.log( 'range' );
				console.log( range );
				if( extr )
				{
					var pageBlock = ( this.commonAncestorContainer() === owner ),
						elms = extr.childNodes,
						ins = undefined;
					
					// frag = extr.cloneNode( true ),
					// kontext.elm.removeChilds( frag );
					for( var i = 0, len = elms.length; i < len; i++ )
					{
			*/			/*
						ins = document.createElement( args );
						if( kontext.isNodeElement( elms[i] ) ){
							ins.innerHTML = elms[i].innerHTML;
						}
						else {
							console.log( elms[i].nodeValue );
							ins.appendChild( document.createTextNode( elms[i].nodeValue ) );
						}
						frag.appendChild( ins );
						*/
			/*		}
					console.log( extr );
					// target.sel.replaceNode( frag );
					// target.sel.insertNode( frag );
				}
			}
			*/
		}
	};
	this.replaceNode = function( node )
	{
		if( range )
		{
			var extr;
			/*
			range.extractContents();
			range.setStart( owner, 0 );
			extr = range.extractContents();
			range.insertNode( node );
			range.insertNode( extr );
			*/
			/*
			bRange.collapse(true);
			extr = bRange.extractContents();
			bRange.insertNode( node );
			console.log( bRange );
			console.log( extr );
			*/
			console.log( node );
			console.log( range );
			console.log( sel );
		}
	};
};