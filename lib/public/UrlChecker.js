"use strict";
const checkUrl     = require("../internal/checkUrl");
const Link         = require("../internal/Link");
const parseOptions = require("../internal/parseOptions");

const maybeCallback = require("maybe-callback");
const RequestQueue = require("limited-request-queue");
const UrlCache = require("urlcache");



class UrlChecker
{
	constructor(options, handlers={})
	{
		this.handlers = handlers;
		this.options = options = parseOptions(options);
	
		this.cache = new UrlCache(
		{
			expiryTime: this.options.cacheExpiryTime,
			normalize: false  // TODO :: should be true when not used by `HtmlChecker`
		});
		
		this.linkQueue = new RequestQueue(
		{
			maxSockets:        this.options.maxSockets,
			maxSocketsPerHost: this.options.maxSocketsPerHost,
			rateLimit:         this.options.rateLimit
		},
		{
			item: (input, done) =>
			{
				checkUrl(input.data.link, this.cache, this.options).then(result =>
				{
					maybeCallback(this.handlers.link)(result, input.data.customData);
					
					// Auto-starts next queue item, if any
					// If not, fires "end"
					done();
				});
			},
			end: () => maybeCallback(this.handlers.end)()
		});
	}
	
	
	
	clearCache()
	{
		return this.cache.clear();
	}
	
	
	
	dequeue(id)
	{
		return this.linkQueue.dequeue(id);
	}
	
	
	
	enqueue(url, customData)
	{
		var link;
		
		// Undocumented internal use: `enqueue(Link)`
		if (Link.isLink(url) === true)
		{
			link = url;
		}
		// Documented use: `enqueue(url)`
		// or erroneous and let linkQueue sort it out
		else
		{
			link = Link.resolve(Link.create(), url);
		}
		
		// TODO :: change limited-request-queue to ONLY accept these args: `enqueue(url, data, id)` -- fewer objects to GC
		return this.linkQueue.enqueue(
		{
			url: link.url.rebased,
			data: { customData:customData, link:link }
		});
	}
	
	
	
	numActiveLinks()
	{
		return this.linkQueue.numActive();
	}
	
	
	
	numQueuedLinks()
	{
		return this.linkQueue.numQueued();
	}
	
	
	
	pause()
	{
		return this.linkQueue.pause();
	}
	
	
	
	resume()
	{
		return this.linkQueue.resume();
	}
	
	
	
	__getCache()
	{
		return this.cache;
	}
}



module.exports = UrlChecker;
