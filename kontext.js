/* (c) 2005-2011 masatoshi teruya, all rights reserved. */

// MARK: kontext
var kontext = {};

kontext.def = {
    body: function(){ return document.getElementsByTagName('body').item(0); },
    maxNum: 1 << 24
};

// MARK: DOM node types
if( !window.Node )
{
    var attr = 'ELEMENT_NODE,ATTRIBUTE_NODE,TEXT_NODE,CDATA_SECTION_NODE,ENTITY_REFERENCE_NODE,ENTITY_NODE,PROCESSING_INSTRUCTION_NODE,COMMENT_NODE,DOCUMENT_NODE,DOCUMENT_TYPE_NODE,DOCUMENT_FRAGMENT_NODE,NOTATION_NODE'.split(',');
    window.Node = {};
    for( var i = 0; i < attr.length; i++ ){
        window.Node[attr[i]] = i+1;
    }
};

// MARK: Point
kontext.point = {};
kontext.point.getCursor = function( evt )
{
    var e = ( evt.touches ) ? evt.touches[0] : evt;
    
    if( e.pageX ){
        return { x:e.pageX, y:e.pageY };
    }
    else
    {
        var scroll = kontext.util.getDocumentScroll();
        return {
            x: scroll.x + e.clientX,
            y: scroll.y + e.clientY
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
kontext.util.loadJS = function( src, callback )
{
    if( !src || !src.length )
    {
        if( kontext.isFunction( callback ) ){
            callback(false);
        }
    }
    else
    {
        var head = document.getElementsByTagName('head'),
            onloaded = function()
            {
                if( src.length ){
                    loadNext();
                }
                else if( kontext.isFunction( callback ) ){
                    callback(true);
                }
            },
            loadNext = function()
            {
                var elm = document.createElement('script');
                
                elm.src = src.shift();
                elm.type = 'text/javascript';
                elm.onload = onloaded;
                elm.onreadystatechange = function()
                {
                    if( this.readyState == "loaded" || this.readyState == "complete" ){
                        onloaded.apply( this );
                    }
                };
                head[0].appendChild( elm );
            };
        
        if( typeof src === 'string' ){
            src = [src];
        }
        
        loadNext();
    }
};

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

kontext.util.easeIn = function( origin, dest, smooth, msec, task, ctx )
{
    if( origin === dest ){
        task( dest, true, ctx );
    }
    else
    {
        var interval = setInterval( function()
            {
                origin += ( dest - origin ) * smooth;
                if( Math.floor( Math.abs( dest - origin ) ) <= 1 ){
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


// MARK: Cookie
kontext.Cookie = {};
kontext.Cookie.get = function()
{
    var cookieObj = undefined,
        regex = new RegExp("; ", "g"),
        cookie = ( document.cookie ) ? document.cookie.split( regex ) : undefined;
    
    if( cookie )
    {
        var len = cookie.length;
        
        cookieObj = {};
        for( var i = 0; i < len; i++ )
        {
            var kv = cookie[i].split( '=', 2 );
            if( !cookieObj[kv[0]] ){
                cookieObj[kv[0]] = [];
            }
            cookieObj[kv[0]].push( kv[1] );
        }
    }

    return cookieObj;
};
kontext.Cookie.set = function( obj )
{
    document.cookie = obj.name + '=' + escape(obj.val) + 
                    ( ( obj.expires ) ? '; expires=' + obj.expire : '' ) +
                    ( ( obj.path ) ? '; path=' + obj.path : '' ) +
                    ( ( obj.domain ) ? '; domain=' + obj.domain : '' ) +
                    ( ( obj.secure ) ? '; secure' : '' );
};
kontext.Cookie.del = function( name, domain, path )
{
    var cookies = kontext.Cookie.get();

    if( cookies[name] != undefined )
    {
        var expire = new Date();
        expire.setSeconds( expire.getSeconds() - 1 );
        console.log( expire );
        kontext.Cookie.set( { 
            name: name, 
            val: '',
            expires: expire.toGMTString(),
            path: path,
            domain: domain
        });
    }
};

// MARK: Event
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
                msg = "kontext.js: could not invoke event '" + evt.type + "'",
                ctx = this.ktx.evt[evt.type].ctx;
            
            // context undefined
            if( !ctx ){
                console.log( [msg,"reason: context undefined"].join("\n") );
            }
            // delegate undefined
            else if( !ctx.delegate )
            {
                // func is not typeof function
                if( !kontext.isFunction( ctx.func ) ){
                    console.log( [msg,"reason: function " + ctx.func + " undefined"].join("\n") );
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
    
    if( kontext.isNode( elm ) )
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
    if( kontext.isNode( parent ) && kontext.isNode( elm ) )
    {
        if( target && kontext.isNode( target.parentNode ) ){
            target.parentNode.insertBefore( elm, ( before ) ? target : target.nextSibling );
        }
        else{
            parent.insertBefore( elm, null );
        }
    }
};

kontext.elm.replace = function( elm, target )
{
    if( kontext.isNode( elm ) && kontext.isNode( target ) && target.parentNode ){
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

/* MARK: Touchable */
kontext.Touchable = function( elm )
{
    var box = undefined,
        cover = undefined,
        origin = {
            point: undefined,
            top: undefined,
            left: undefined
        },
        init = function( elm )
        {
            var firstNode = elm.firstChild;
            
            while( firstNode && !kontext.isNode( firstNode ) ){
                firstNode = firstNode.nextSibling;
            }
            
            if( firstNode )
            {
                var rect = kontext.elm.getRect( elm ),
                    style = {
                        box: {
                            cursor: '-webkit-grab',
                            overflow: 'hidden'
                        },
                        cover: {
                            backgroundColor: '#000',
                            position: 'absolute',
                            width: '100%',
                            left: '0',
                            height: rect.height - 4 + 'px',
                            opacity: 0
                        }
                    };
                // box setup
                box = elm;
                for( var p in style.box ){
                    box.style[p] = style.box[p];
                }
                // cover setup
                cover = document.createElement('div');
                for( var p in style.cover ){
                    cover.style[p] = style.cover[p];
                }
                cover.className = 'TouchCover';
                cover.innerHTML = '&nbsp;';
                kontext.elm.insert( box, cover, firstNode, true );
                
                // mouse
                kontext.ev.add( cover, 'mousedown', mousedown, false );
                kontext.ev.add( cover, 'mouseup', mouseup, true );
                kontext.ev.add( cover, 'mousemove', mousemove, false );
                kontext.ev.add( cover, 'mouseout', mouseup, true );
                // touch
                kontext.ev.add( cover, 'touchstart', mousedown, false );
                kontext.ev.add( cover, 'touchend', mouseup, true );
                kontext.ev.add( cover, 'touchmove', mousemove, false );
            }
        },
        mousedown = function( evt ){
            origin.point = kontext.point.getCursor( evt );
            origin.top = box.scrollTop;
            origin.left = box.scrollLeft;
            box.style.cursor = '-webkit-grabbing';
            kontext.ev.stop( evt );
        },
        mouseup = function( evt ){
            delete origin.point;
            origin.point = undefined;
            box.style.cursor = '-webkit-grab';
            kontext.ev.stop( evt );
        },
        mousemove = function( evt )
        {
            if( origin.point )
            {
                var current = kontext.point.getCursor( evt );
                box.scrollLeft += ( origin.point.x - current.x );
                box.scrollTop += ( origin.point.y - current.y );
                origin.point.x = current.x;
                origin.point.y = current.y;
            }
        };
    
    if( kontext.isString( elm ) ){
        elm = document.getElementById(elm);
    }
    // if( !kontext.isNode( elm ) ){
    if( !elm ){
        throw new Error( 'elm is not element node' );
    }
    init( elm );
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
function ShowProperty( aObj, aEndl )
{
    var str = '',
        props = [];
    
    aEndl = ( aEndl ) ? aEndl : "\n";
    str += '<b>PROPERTIES</b>' + aEndl;
    
    for( var p in aObj )
    {
        if( !( p.match( /^(?:(inner|outer)(HTML|Text)|textContent)$/ ) ) ){
            props.push( p );
        }
    }
    props = props.sort();
    for( var i = 0, length = props.length; i < length; i++ ){
        try{        str += props[i] + ' = ' + aObj[props[i]] + aEndl;    }
        catch(e){    str += props[i] + ' = ERROR{' + e + '}' + aEndl;    }
    }
    
    return str;
}

// MARK: XML HTTP Request
kontext.Request = function()
{
    // internal use
    var ctx = {},
        task = {},
        ntask = [],
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
            sandbox.form.action = obj.url;
            // referrer
            if( obj.ref )
            {
                obj.ref = encodeURIComponent( document.location.href.split( '://', 2 )[0] + '://' + document.location.host );
                if( obj.url.match( /\?/ ) ){
                    sandbox.form.action += '&via=' + obj.ref;
                }
                else {
                    sandbox.form.action += '?via=' + obj.ref;
                }
            }
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
            console.log( arguments[1] );
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
            console.log( this.location );
            console.log( ShowProperty( this ) );
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
            if( obj.onReady.apply( this, [evt,obj] ) ){
                console.log( 'submitViaSandbox' );
                // add events
                kontext.ev.add( obj.frame, 'readystatechange', progress, true, null, obj );
                // kontext.ev.add( obj.frame, 'load', progress, true, null, obj );
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
            var next = this.ctx.onReady.apply( this, arguments );
            if( this.readyState === 4 ){
                invokeFinish( this.ctx.id, next );
            }
        },
        invokeByXHR = function( obj )
        {
            var    url = obj.url + '?' + obj.id,
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
                    query = query.join('&');
                }
                else {
                    query = null;
                }
            }
            else
            {
                if( query.length ){
                    query = '&' + query.join('&');
                }
                obj.xhr.open( obj.method, url + query, true );
                query = null;
            }
            
            // add headers
            for( var key in obj.header )
            {
                var val = obj.header[key];
                
                for( var i = 0, len = val.length; i < len; i++ ){
                    obj.xhr.setRequestHeader( key, val[i] );
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
        if( kontext.isObject( header ) )
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
        if( ctx[id] && kontext.isString( method ) ){
            ctx[id].method = method.toLowerCase();
        }
    };
    this.setURL = function( id, url )
    {
        if( ctx[id] && kontext.isString( url ) ){
            ctx[id].url = url;
        }
    };
    this.setHeader = function( id, key, val, overwrite )
    {
        if( ctx[id] && kontext.isString( key ) )
        {
            var obj = ctx[id];
            
            if( !val ){
                delete obj.header[key];
            }
            else
            {
                if( overwrite )
                {
                    if( kontext.isString( val ) ){
                        obj.header[key] = val;
                    }
                    else if( kontext.isArray( val ) )
                    {
                        delete obj.header[key];
                        obj.header[key] = [];
                        
                        for( var i = 0, len = val.length; i < len; i++ )
                        {
                            if( kontext.isString( val[i] ) ){
                                obj.header[key].push( val[i] );
                            }
                        }
                        if( !obj.header[key].length ){
                            delete obj.header[key];
                        }
                    }
                }
                else
                {
                    if( !kontext.isArray( obj.header[key] ) ){
                        obj.header[key] = [];
                    }
                    
                    if( kontext.isString( val ) ){
                        obj.header[key].push( val );
                    }
                    else if( kontext.isArray( val ) )
                    {
                        for( var i = 0, len = val.length; i < len; i++ )
                        {
                            if( kontext.isString( val[i] ) ){
                                obj.header[key].push( val[i] );
                            }
                        }
                    }
                    if( !obj.header[key].length ){
                        delete obj.header[key];
                    }
                }
            }
        }
    };
    this.setQuery = function( id, query )
    {
        if( ctx[id] && kontext.isObject( query ) )
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
    this.send = function( id, ref, useSandbox, onReady, onAbort )
    {
        var obj = ctx[id];
        
        if( obj )
        {
            obj.onReady = onReady;
            if( ref ){
                obj.ref = true;
            }
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

/*
    MARK: Geometry
    Supported Google Maps version 3
    (c) Copyright 2010 Masatoshi Teruya All rights reserved.
*/
kontext.Geo = {};
kontext.Geo.Hash = function()
{
    var PRECISION_DEFAULT = 11,
        PRECISION_MAX = 16,
        BITS = [16,8,4,2,1],
        BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz'.split(''),
        BASE32_CODE = {};
    
    // setup
    for( var i = 0, len = BASE32.length; i < len; i++ ){
        BASE32_CODE[BASE32[i]] = i;
    }
    
    this.encode = function( lat, lon, precision, callback )
    {
        var hash = '',
            rangeLat = [-90.0, 90.0],
            rangeLon = [-180.0, 180.0],
            islon = true,
            bit = 0, code = 0,
            calc = function()
            {
                var mid;
                
                if( islon )
                {
                    mid = ( rangeLon[0] + rangeLon[1] ) / 2;
                    if( lon >= mid ){
                        code |= BITS[bit];
                        rangeLon[0] = mid;
                    }
                    else{
                        rangeLon[1] = mid;
                    }
                }
                else
                {
                    mid = ( rangeLat[0] + rangeLat[1] ) / 2;
                    if( lat >= mid ){
                        code |= BITS[bit];
                        rangeLat[0] = mid;
                    }
                    else{
                        rangeLat[1] = mid;
                    }
                }
                islon = !islon;
                if( bit < 4 ){
                    bit++;
                }
                else {
                    hash += BASE32[code];
                    bit = code = 0;
                    precision--;
                }
                if( precision ){
                    setTimeout( calc, 1 );
                }
                else {
                    callback( hash );
                }
            };
        
        if( !precision || precision < 1 ){
            precision = PRECISION_DEFAULT;
        }
        else if( precision > PRECISION_MAX ){
            precision = PRECISION_MAX;
        }
        calc();
    };
    
    this.decode = function( geohash, callback )
    {
        var hash = geohash.toLowerCase().split(''),
            code = hash.shift(),
            rangeLat = [-90.0, 90.0],
            rangeLon = [-180.0, 180.0],
            islon = true,
            calc = function()
            {
                if( BASE32_CODE[code] === undefined ){
                    callback( new Error( 'invalid hash code:' + idx ) );
                }
                else
                {
                    code = BASE32_CODE[code];
                    for( var bit = 0; bit < 5; bit++ )
                    {
                        if( islon ){
                            rangeLon[( code & BITS[bit] ) ? 0 : 1] = ( rangeLon[0] + rangeLon[1] ) / 2;
                        }
                        else {
                            rangeLat[( code & BITS[bit] ) ? 0 : 1] = ( rangeLat[0] + rangeLat[1] ) / 2;
                        }
                        islon = !islon;
                    }
                    
                    if( ( code = hash.shift() ) ){
                        setTimeout( calc, 1 );
                    }
                    else {
                        callback( undefined, ( rangeLat[0] + rangeLat[1] ) / 2, ( rangeLon[0] + rangeLon[1] ) / 2 );
                    }
                }
            };
        
        calc();
    };

};

// MARK: WGS84(1984)
// 緯度 = latitude = y
// 経度 = longitude = x
kontext.Geo.WGS84 = function( opt )
{
        // 扁平率 = 298.257223563
    var _f = 1 / 298.257223563;
        // 軌道長半径(m) = 6,378,137.0
        _major = 6378137.0,
        // 軌道短半径(m) = 6,356,752.314245
        _minor = 6356752.314245,
        // 離心率(eccentricity) = ( ( 長半径 * 長半径 ) - ( 短半径 * 短半径 ) ) / ( 長半径 * 長半径 )
        tmp = _major * _major;
        _eccentricity = ( tmp - ( _minor * _minor ) ) / tmp;
        _rad = Math.PI / 180;
        _deg = 180 / Math.PI;
        distWGS84 = 0;
        trigWGS84 = null;
        origin = {
            // 緯度
            lat: {
                // degree
                deg: 0,
                // radian
                rad: 0,
                sin: 0,
                cos: 0
            },
            // 経度
            lng: {
                // degree
                deg: 0,
                // radian
                rad: 0,
                sin: 0,
                cos: 0
            }
        };
    
    this.setOrigin = function( lat, lng )
    {
        origin.lat.deg = lat;
        origin.lat.rad = _rad * lat;
        origin.lat.sin = Math.sin( origin.lat.rad );
        origin.lat.cos = Math.cos( origin.lat.rad );
        
        origin.lng.deg = lng;
        origin.lng.rad = _rad * lng;
        origin.lng.sin = Math.sin( origin.lng.rad );
        origin.lng.cos = Math.cos( origin.lng.rad );
    };
    // aDistance = meter
    this.setDistance = function( distance ){
        distWGS84 = distance / _major;
        trigWGS84 = { sin: Math.sin( distWGS84 ), cos: Math.cos( distWGS84 ) };
    };
    this.getLatLngForAngle = function( angle )
    {
        angle = angle * _rad;
        var lat = Math.asin( origin.lat.sin * trigWGS84.cos + origin.lat.cos * trigWGS84.sin * Math.cos( angle ) );
        var lng = origin.lng.rad + Math.atan2( Math.sin( angle ) * trigWGS84.sin * origin.lat.cos, ( trigWGS84.cos - origin.lat.sin * origin.lat.sin ) );
        lng = ( lng + Math.PI ) % ( 2 * Math.PI ) - Math.PI;
        return { lat: lat * _deg, lng: lng * _deg };
    };
    this.deg2rad = function( lat, lng )
    {
        return {
            lat: aLat * _rad,
            lng: aLng * _rad
        };
    };
    this.getDistance = function( latlng )
    {
        var dest = this.deg2rad( latlng.lat(), latlng.lng() ),
            deg = origin.lat.sin * Math.sin( dest.lat ) + origin.lat.cos * Math.cos( dest.lat ) * Math.cos( dest.lng - origin.lng.rad ),
            dist = _major * ( Math.atan( -deg / Math.sqrt( -deg * deg + 1 ) ) + Math.PI / 2 );
        
        return Math.round( dist );
    };
    /*
        meridian = 子午線曲線率半径
        primeVertical = 卯酉線半径
        distance = f( latlng1, latlng2 )
                = sqrt( pow( latDiff * meridian, 2 ) + pow( lngDiff * primeVertical * cos( ave ), 2 ) )
        latDiff = lat1 - lat2 * degree;
        lngDiff = lng1 - lng2 * degree;
        ave = ( lat1 + lat2 ) * degree / 2;
    */
    this.getDistance2 = function( latlng )
    {
        var dest = this.deg2rad( latlng.lat(), latlng.lng() ),
            ave = ( origin.lat.rad + dest.lat ) / 2,
            latDiff = origin.lat.rad - dest.lat,
            lngDiff = origin.lng.rad - dest.lng,
            sin = Math.sin( ave ),
            W = 1 - _eccentricity * sin * sin,
            meridian = _major / Math.sqrt( Math.pow( W, 3 ) ),
            primeVertical = _minor / Math.sqrt( W );
        
        latDiff = latDiff * meridian;
        lngDiff = lngDiff * primeVertical * Math.cos( ave );
        
        return Math.round( Math.sqrt( ( latDiff * latDiff ) + ( lngDiff * lngDiff ) ) );
    };
    
    this.setOrigin( opt.lat, opt.lng );
    this.setDistance( opt.distance );
};

kontext.Geo.Corder = function()
{
    var corder = new google.maps.Geocoder();
    
    // MARK: GeoCorder
    this.getByAddr = function( req, callback )
    {
        corder.geocode( req, function( res, rc )
        {
            var latlng = undefined;
            switch( rc )
            {
                case google.maps.GeocoderStatus.OK:
                    latlng = res[0].geometry.location;
                break;
                case google.maps.GeocoderStatus.ERROR:
                    alert( 'There was a problem contacting the Google servers.' );
                break;
                
                case google.maps.GeocoderStatus.INVALID_REQUEST:
                    alert( 'This GeocoderRequest was invalid.' );
                break;

                case google.maps.GeocoderStatus.OVER_QUERY_LIMIT:
                    alert( 'The webpage has gone over the requests limit in too short a period of time.' );
                break;
                
                case google.maps.GeocoderStatus.REQUEST_DENIED:
                    alert( 'The webpage is not allowed to use the geocoder.' );
                break;
                
                case google.maps.GeocoderStatus.UNKNOWN_ERROR:
                    alert( 'A geocoding request could not be processed due to a server error. The request may succeed if you try again.' );
                break;
                
                // google.maps.GeocoderStatus.ZERO_RESULTS
                default:
                    alert('不明な住所です。');
            }
            
            if( typeof callback === 'function' ){
                callback( latlng );
            }
        });
    };
};

kontext.Geo.Map = function( elm, opt, delegate )
{
    var defaultOpt = {
            zoom: 13,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            scaleControl: true,
            scrollwheel: false
        },
        map = undefined;
    
    // getter/setter
    this.__defineGetter__( 'self', function(){
        return map;
    });
    this.__defineSetter__( 'options', function( opts ){
        map.setOptions( opts );
    });
    this.__defineSetter__( 'center', function( latlng ){
        map.setCenter( latlng );
    });
    this.__defineSetter__( 'panTo', function( latlng ){
        map.panTo( latlng );
    });
    this.__defineSetter__( 'zoom', function( zoom ){
        map.setZoom( zoom );
    });
    
    // MARK: public method
    this.setEvent = function( evt, method )
    {
        google.maps.event.addDomListener( map, evt, function(){
            delegate[method].apply( delegate, arguments );
        });
    };
    
    // marge otion
    for( var p in opt ){
        defaultOpt[p] = opt[p];
    }
    map = new google.maps.Map( elm, defaultOpt );
};

kontext.Geo.Markers = function( map, delegate )
{
    var serial = 0,
        mkr = {};
    
    this.add = function( opt ){
        serial++;
        mkr[''+serial] = new google.maps.Marker( opt );
        mkr[''+serial].setMap( map );
        return serial;
    };
    this.remove = function( id )
    {
        if( mkr[id] ){
            mkr[id].setMap( null );
            delete mkr[id];
        }
    };
    this.getPosition = function( id ){
        return mkr[id].getPosition();
    };
    this.setPosition = function( id, latlng ){
        mkr[id].setPosition( latlng );
    };
    this.setOptions = function( id, opts ){
        mkr[id].setOptions( opts );
    };
    this.setEvent = function( id, evt, method )
    {
        google.maps.event.addDomListener( mkr[id], evt, function(){
            delegate[method].apply( delegate, arguments );
        });
    };
    this.setCenter = function( id ){
        mkr[id].getMap().setCenter( mkr[id].getPosition() );
    };
    this.panTo = function( id ){
        mkr[id].getMap().panTo( mkr[id].getPosition() );
    };
    this.setZoom = function( zoom ){
        mkr[id].getMap().setZoom( zoom );
    };
};

kontext.Geo.InfoWindow = function( opt )
{
    var infoWindow = new google.maps.InfoWindow( opt );
    
    // getter/setter
    this.__defineGetter__( 'self', function(){
        return infoWindow;
    });
    this.__defineGetter__( 'content', function(){
        return infoWindow.getContent();
    });
    this.__defineSetter__( 'content', function( content ){
        infoWindow.setContent( content );
    });
    this.__defineGetter__( 'position', function(){
        return infoWindow.getPosition();
    });
    this.__defineSetter__( 'position', function( latlng ){
        infoWindow.setPosition( latlng );
    });
    this.__defineGetter__( 'zIndex', function(){
        return infoWindow.getZIndex();
    });
    this.__defineSetter__( 'zIndex', function( idx ){
        infoWindow.setZIndex( idx );
    });
    this.__defineGetter__( 'options', function( opt ){
        infoWindow.setOptions( opt );
    });
    
    this.open = function( map, anchor ){
        infoWindow.open( map, anchor );
    };
    this.close = function(){
        infoWindow.close();
    };
    
    this.setEvent = function( evt, once, method )
    {
        if( once ){
            return google.maps.event.addDomListenerOnce( infoWindow, evt, function(){
                delegate[method].apply( delegate, arguments );
            });
        }
        
        return google.maps.event.addDomListener( infoWindow, evt, function(){
            delegate[method].apply( delegate, arguments );
        });
    };
};

kontext.Geo.Polygon = function( map )
{
    var serial = 0,
        plygs = {};
    
    this.add = function( opt ){
        serial++;
        plygs[''+serial] = new google.maps.Polygon( opt );
        plygs[''+serial].setMap( map );
        return serial;
    };
    this.remove = function( id ){
        plygs[id].setMap(null);
        delete plygs[polyId];
    };
    this.drawCircle = function( latlng, dist, smooth )
    {
        var corner = 1,
            paths = [],
            wgs84 = new kontext.Geo.WGS84({
                distance:dist, 
                lat:latlng.lat(),
                lng:latlng.lng()
            });
        
        if( smooth ){
            corner = 360 / ( ( smooth < 2 ) ? 5 : smooth );
        }
        else{
            corner = 10;
        }
        
        for( var i = 0; i < 360; i += corner )
        {
            if( i <= 360 ){
                latlng = wgs84.getLatLngForAngle( i );
                paths.push( new google.maps.LatLng( latlng.lat, latlng.lng ) );
            }
        }
        
        this.add( { paths:paths } );
        // map.fitBounds( new google.maps.LatLngBounds( paths.getAt( 0 ), paths.getAt( Math.ceil( paths.length / 2 ) ) ) );
    };
};

/*
kontext.Geo.Direction = function()
{
    var direction = new google.maps.DirectionsService();

    this.route = function( req, callback )
    {
        direction.route( req, function( res, rc )
        {
            switch( rc )
            {
                case google.maps.GeocoderStatus.OK:
                    latlng = res[0].geometry.location;
                break;
                case google.maps.GeocoderStatus.ERROR:
                    alert( 'There was a problem contacting the Google servers.' );
                break;
                
                case google.maps.GeocoderStatus.INVALID_REQUEST:
                    alert( 'This GeocoderRequest was invalid.' );
                break;

                case google.maps.GeocoderStatus.OVER_QUERY_LIMIT:
                    alert( 'The webpage has gone over the requests limit in too short a period of time.' );
                break;
                
                case google.maps.GeocoderStatus.REQUEST_DENIED:
                    alert( 'The webpage is not allowed to use the geocoder.' );
                break;
                
                case google.maps.GeocoderStatus.UNKNOWN_ERROR:
                    alert( 'A geocoding request could not be processed due to a server error. The request may succeed if you try again.' );
                break;
                
                // google.maps.GeocoderStatus.ZERO_RESULTS
                default:
                    alert('不明な住所です。');
            }

        });
    }
    this.SetDirection = function( aDirection, aGMap )
    {
        var direction = null;
        if( aDirection )
        {
            var self = this;
            
            if( this.direction ){
                delete this.direction;
            }
            direction = new GDirections( aGMap, aDirection );
            GEvent.addListener( direction, 'error', function(){
                self.Error( this );
            } );
        }
        
        return direction;
    };
    this.Error = function( aErr )
    {
        var gdir = this.direction;
        
        if (gdir.getStatus().code == G_GEO_UNKNOWN_ADDRESS){
            alert("No corresponding geographic location could be found for one of the specified addresses. This may be due to the fact that the address is relatively new, or it may be incorrect.\nError code: " + gdir.getStatus().code);
        }
        else if (gdir.getStatus().code == G_GEO_SERVER_ERROR){
            alert("A geocoding or directions request could not be successfully processed, yet the exact reason for the failure is not known.\n Error code: " + gdir.getStatus().code);
        }
        else if (gdir.getStatus().code == G_GEO_MISSING_QUERY){
            alert("The HTTP q parameter was either missing or had no value. For geocoder requests, this means that an empty address was specified as input. For directions requests, this means that no query was specified in the input.\n Error code: " + gdir.getStatus().code);
        }
        else if (gdir.getStatus().code == G_GEO_BAD_KEY){
            alert("The given key is either invalid or does not match the domain for which it was given. \n Error code: " + gdir.getStatus().code);
        }
        else if (gdir.getStatus().code == G_GEO_BAD_REQUEST){
            alert("A directions request could not be successfully parsed.\n Error code: " + gdir.getStatus().code);
        }
        else{
            alert("An unknown error occurred.\n" + ShowProperty( gdir.getStatus() ) );
        }
    };
};
*/




// MARK: Type Checker
kontext.isClassOf = function( arg, className ){
    return ( arg && arg.constructor === className );
};
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
    return ( arg && ( typeof arg === 'function' || typeof arg.constructor === 'function' ) );
};
kontext.isObject = function( arg ){
    return ( typeof arg === 'object' );
};
kontext.isArray = function( arg ){
    return ( arg && arg.constructor === Array );
};
kontext.isDate = function( arg ){
    return ( arg && arg.constructor === Date );
};
kontext.isRegExp = function( arg ){
    return ( arg && arg.constructor === RegExp );
};
kontext.isNode = function( arg ){
    return ( arg && arg.nodeType === Node.ELEMENT_NODE );
};
kontext.isNodeAttribute = function( arg ){
    return ( arg && arg.nodeType === Node.ATTRIBUTE_NODE );
};
kontext.isNodeText = function( arg ){
    return ( arg && arg.nodeType === Node.TEXT_NODE );
};



// !!!: still working

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
                range.setStart( current, 0 );
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
        
        if( node && shouldElm && !kontext.isNode( node ) ){
            node = node.parentNode;
        }
        
        return node 
    };
    this.lastNode = function( shouldElm )
    {
        var node = ( range ) ? range.endContainer : undefined;
        
        if( node && shouldElm && !kontext.isNode( node ) ){
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
                        if( current && shouldElm && !kontext.isNode( current ) ){
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
//        range.setStart( owner, 0 );
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
            */            /*
                        ins = document.createElement( args );
                        if( kontext.isNode( elms[i] ) ){
                            ins.innerHTML = elms[i].innerHTML;
                        }
                        else {
                            console.log( elms[i].nodeValue );
                            ins.appendChild( document.createTextNode( elms[i].nodeValue ) );
                        }
                        frag.appendChild( ins );
                        */
            /*        }
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
