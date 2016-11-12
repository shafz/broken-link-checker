"use strict";
const helpers        = require("./helpers");
const HtmlUrlChecker = require("../lib/public/HtmlUrlChecker");
const messages       = require("../lib/internal/messages");

const expect = require("chai").expect;



describe("PUBLIC -- HtmlUrlChecker", function()
{
	before(() => helpers.startServer("http://blc/"));
	after(helpers.stopServers);
	
	
	
	describe("methods (#1)", function()
	{
		describe("enqueue()", function()
		{
			it("accepts a valid url", function()
			{
				const id = new HtmlUrlChecker( helpers.options() ).enqueue("http://blc/");
				
				expect(id).to.not.be.an.instanceOf(Error);
			});
			
			
			
			it("rejects an invalid url", function()
			{
				const id = new HtmlUrlChecker( helpers.options() ).enqueue("/path/");
				
				expect(id).to.be.an.instanceOf(Error);
			});
		});
	});
	
	
	
	// TODO :: find a way to test "junk" without requiring the use of an option
	describe("handlers", function()
	{
		it("html", function(done)
		{
			new HtmlUrlChecker( helpers.options(),
			{
				html: function(tree, robots, response, pageUrl, customData)
				{
					expect(tree).to.be.an.instanceOf(Object);
					expect(robots).to.be.an.instanceOf(Object);
					expect(response).to.be.an.instanceOf(Object);
					expect(pageUrl).to.be.an.instanceOf(Object);
					expect(customData).to.be.a("number");
					done();
				}
			}).enqueue("http://blc/normal/index.html", 123);
		});
		
		
		
		it("link", function(done)
		{
			var count = 0;
			
			new HtmlUrlChecker( helpers.options(),
			{
				link: function(result, customData)
				{
					// HTML has more than one link, so only accept the first
					// to avoid calling `done()` more than once
					if (++count > 1) return;
					
					expect(arguments).to.have.length(2);
					expect(result).to.be.an.instanceOf(Object);
					expect(customData).to.be.a("number");
					done();
				}
			}).enqueue("http://blc/normal/index.html", 123);
		});
		
		
		
		it("page", function(done)
		{
			new HtmlUrlChecker( helpers.options(),
			{
				page: function(error, pageUrl, customData)
				{
					expect(arguments).to.have.length(3);
					expect(error).to.be.null;
					expect(pageUrl).to.be.an.instanceOf(Object);
					expect(customData).to.be.a("number");
					done();
				}
			}).enqueue("http://blc/normal/index.html", 123);
		});
		
		
		
		it("end", function(done)
		{
			new HtmlUrlChecker( helpers.options(),
			{
				end: function()
				{
					expect(arguments).to.have.length(0);
					done();
				}
			}).enqueue("http://blc/normal/index.html");
		});
	});
	
	
	
	describe("methods (#2)", function()
	{
		describe("numActiveLinks()", function()
		{
			it("works", function(done)
			{
				var htmlCalled = false;
				
				const instance = new HtmlUrlChecker( helpers.options(),
				{
					html: function()
					{
						// Give time for link checks to start
						setImmediate( function()
						{
							expect( instance.numActiveLinks() ).to.equal(2);
							htmlCalled = true;
						});
					},
					end: function()
					{
						expect(htmlCalled).to.be.true;
						expect( instance.numActiveLinks() ).to.equal(0);
						done();
					}
				});
				
				instance.enqueue("http://blc/normal/index.html");
				
				expect( instance.numActiveLinks() ).to.equal(0);
			});
		});
		
		
		
		describe("pause() / resume()", function()
		{
			it("works", function(done)
			{
				var resumed = false;
				
				const instance = new HtmlUrlChecker( helpers.options(),
				{
					end: function()
					{
						expect(resumed).to.be.true;
						done();
					}
				});
				
				instance.pause();
				
				instance.enqueue("http://blc/");
				
				// Wait longer than scan should take
				setTimeout( function()
				{
					resumed = true;
					instance.resume();
					
				}, 100);
			});
		});
		
		
		
		// TODO :: test what happens when the current queue item is dequeued
		describe("dequeue() / numPages() / numQueuedLinks()", function()
		{
			it("accepts a valid id", function(done)
			{
				const instance = new HtmlUrlChecker( helpers.options(),
				{
					end: function()
					{
						expect( instance.numPages() ).to.equal(0);
						expect( instance.numQueuedLinks() ).to.equal(0);
						done();
					}
				});
				
				// Prevent first queued item from immediately starting (and thus being auto-dequeued)
				instance.pause();
				
				const id = instance.enqueue("http://blc/normal/index.html");
				
				expect(id).to.not.be.an.instanceOf(Error);
				expect( instance.numPages() ).to.equal(1);
				expect( instance.numQueuedLinks() ).to.equal(0);
				expect( instance.dequeue(id) ).to.be.true;
				expect( instance.numPages() ).to.equal(0);
				expect( instance.numQueuedLinks() ).to.equal(0);
				
				instance.enqueue("http://blc/normal/index.html");
				instance.resume();
				
				// Wait for HTML to be downloaded and parsed
				setImmediate( function()
				{
					expect( instance.numPages() ).to.equal(1);
					expect( instance.numQueuedLinks() ).to.equal(2);
				});
			});
			
			
			
			it("rejects an invalid id", function()
			{
				const instance = new HtmlUrlChecker( helpers.options() );
				
				// Prevent first queued item from immediately starting (and thus being auto-dequeued)
				instance.pause();
				
				const id = instance.enqueue("http://blc/");
				
				expect( instance.dequeue(id+1) ).to.be.an.instanceOf(Error);
				expect( instance.numPages() ).to.equal(1);
			});
		});
	});
	
	
	
	describe("edge cases", function()
	{
		it("supports custom data", function(done)
		{
			var linkCalled = false;
			var pageCalled = false;
			
			new HtmlUrlChecker( helpers.options(),
			{
				link: function(result, customData)
				{
					expect(customData).to.be.an.instanceOf(Object);
					expect(customData.test).to.equal("value");
					linkCalled = true;
				},
				page: function(error, pageUrl, customData)
				{
					expect(customData).to.be.an.instanceOf(Object);
					expect(customData.test).to.equal("value");
					pageCalled = true;
				},
				end: function()
				{
					expect(linkCalled).to.be.true;
					expect(pageCalled).to.be.true;
					done();
				}
			}).enqueue("http://blc/normal/index.html", {test:"value"});
		});
		
		
		
		it("supports multiple queue items", function(done)
		{
			const results = [];
			
			const instance = new HtmlUrlChecker( helpers.options(),
			{
				link: function(result, customData)
				{
					if (results[ customData.index ] === undefined)
					{
						results[ customData.index ] = [];
					}
					
					results[ customData.index ][ result.html.index ] = result;
				},
				end: function()
				{
					expect(results).to.have.length(2);
					
					expect(results[0]).to.have.length(2);
					expect(results[0][0].broken).to.be.false;  // with-links.html
					expect(results[0][1].broken).to.be.true;   // fake.html
					
					expect(results[1]).to.have.length(2);
					expect(results[1][0].broken).to.be.false;  // with-links.html
					expect(results[1][1].broken).to.be.true;   // fake.html
					
					done();
				}
			});
			
			instance.enqueue("http://blc/normal/index.html", {index:0});
			instance.enqueue("http://blc/normal/index.html", {index:1});
		});
		
		
		
		it("supports html with no links", function(done)
		{
			var linkCount = 0;
			var pageCalled = false;
			
			new HtmlUrlChecker( helpers.options(),
			{
				link: function()
				{
					linkCount++;
				},
				page: function()
				{
					pageCalled = true;
				},
				end: function()
				{
					expect(pageCalled).to.be.true;
					expect(linkCount).to.equal(0);
					done();
				}
			}).enqueue("http://blc/normal/no-links.html");
		});
		
		
		
		it("supports pages after html with no links", function(done)
		{
			var linkCount = 0;
			var pageCount = 0;
			
			const instance = new HtmlUrlChecker( helpers.options(),
			{
				link: function()
				{
					linkCount++;
				},
				page: function()
				{
					pageCount++;
				},
				end: function()
				{
					expect(linkCount).to.equal(2);
					expect(pageCount).to.equal(2);
					done();
				}
			});

			instance.enqueue("http://blc/normal/no-links.html");
			instance.enqueue("http://blc/normal/index.html");
		});
		
		
		
		it("reports an error when html cannot be retrieved", function(done)
		{
			var pageCalled = false;
			
			new HtmlUrlChecker( helpers.options(),
			{
				page: function(error, pageUrl, customData)
				{
					expect(error).to.be.an.instanceOf(Error);
					expect(error.message).to.equal( messages.errors.HTML_RETRIEVAL );
					expect(pageUrl).to.be.an.instanceOf(Object);
					pageCalled = true;
				},
				end: function()
				{
					expect(pageCalled).to.be.true;
					done();
				}
			}).enqueue("http://blc/normal/fake.html");
		});
		
		
		
		it("supports pages after html could not be retrieved", function(done)
		{
			var pageCount = 0;
			
			const instance = new HtmlUrlChecker( helpers.options(),
			{
				page: function(error, pageUrl, customData)
				{
					if (++pageCount === 1)
					{
						expect(error).to.be.an.instanceOf(Error);
					}
					else
					{
						expect(error).to.not.be.an.instanceOf(Error);
					}
				},
				end: function()
				{
					expect(pageCount).to.equal(2);
					done();
				}
			});
			
			instance.enqueue("http://blc/normal/fake.html");
			instance.enqueue("http://blc/normal/no-links.html");
		});
	});
	
	
	
	describe("options", function()
	{
		it("honorRobotExclusions = false (header)", function(done)
		{
			const results = [];
			
			new HtmlUrlChecker( helpers.options(),
			{
				junk: function(result)
				{
					done( new Error("this should not have been called") );
				},
				link: function(result)
				{
					results[result.html.offsetIndex] = result;
				},
				end: function()
				{
					expect(results).to.have.length(1);
					expect(results[0]).to.be.like(
					{
						broken: false,
						excluded: false,
						excludedReason: null
					});
					done();
				}
			}).enqueue("http://blc/disallowed/header.html");
		});
		
		
		
		it("honorRobotExclusions = true (header)", function(done)
		{
			const junkResults = [];
			
			new HtmlUrlChecker( helpers.options({ honorRobotExclusions:true }),
			{
				junk: function(result)
				{
					junkResults[result.html.offsetIndex] = result;
				},
				link: function(result)
				{
					done( new Error("this should not have been called") );
				},
				end: function()
				{
					expect(junkResults).to.have.length(1);
					expect(junkResults[0]).to.be.like(
					{
						broken: null,
						excluded: true,
						excludedReason: "BLC_ROBOTS"
					});
					done();
				}
			}).enqueue("http://blc/disallowed/header.html");
		});
		
		
		
		// TODO :: honorRobotExcluses=true (header) + userAgent=Googlebot/2.1
	});
});
