"use strict";
const helpers    = require("./helpers");
const parseHtml  = require("../lib/internal/parseHtml");
const scrapeHtml = require("../lib/internal/scrapeHtml");
const tagTests   = require("./helpers/json/scrapeHtml.json");

const expect = require("chai").expect;



function wrapper(input, baseUrl, robots)
{
	return parseHtml(input).then(document => scrapeHtml(document, baseUrl, robots));
}



describe("INTERNAL -- parseHtml / scrapeHtml", function()
{
	it("supports a string", function()
	{
		return wrapper("<html></html>")
		.then(links => expect(links).to.be.an.instanceOf(Array));
	});
	
	
	
	it("supports a stream", function()
	{
		return wrapper( helpers.fixture.stream("/normal/no-links.html") )
		.then(links => expect(links).to.be.an.instanceOf(Array));
	});
	
	
	
	describe("link tags & attributes", function()
	{
		for (let test in tagTests)
		{
			const data = tagTests[test];
			const skipOrOnly = data.skipOrOnly==null ? "" : "."+data.skipOrOnly;
			
			eval(`
				it${skipOrOnly}("supports ${helpers.addSlashes(test)}", function()
				{
					return wrapper("${helpers.addSlashes(data.html)}", "http://domain.com/").then(links =>
					{
						expect(links).to.have.length(${data.length});
						expect(links[0]).to.be.like(${JSON.stringify(data.link, null, "\t")});
					});
				});
			`);
		}
	});
	
	
	
	describe("edge cases", function()
	{
		it('ignores <meta content/> lacking http-equiv="refresh"', function()
		{
			return wrapper('<meta http-equiv="other" content="5; url=file.html"/>').then(links =>
			{
				expect(links).to.be.empty;
				
				return wrapper('<meta content="5; url=file.html"/>');
			})
			.then(links => expect(links).to.be.empty);
		});
		
		
		
		it("supports link attributes with values surrounded by spaces", function()
		{
			return wrapper('<a href=" file.html ">link</a>').then(links =>
			{
				expect(links).to.have.length(1);
				expect(links[0]).to.be.like(
				{
					url: { original:"file.html" },
					html: { tag:'<a href=" file.html ">' }
				});
			});
		});
		
		
		
		it("supports link attributes preceded by non-link attributes", function()
		{
			return wrapper('<a id="link" href="file.html">link</a>').then(links =>
			{
				expect(links).to.have.length(1);
				expect(links[0]).to.be.like(
				{
					url: { original:"file.html" },
					html:
					{
						attrName: "href",
						attrs: { href:"file.html", id:"link" },
						tag: '<a id="link" href="file.html">'
					}
				});
			});
		});
		
		
		
		it("supports consecutive link attributes", function()
		{
			return wrapper('<img src="file.png" longdesc="file.html"/>').then(links =>
			{
				expect(links).to.have.length(2);
				expect(links).to.be.like(
				[
					{
						url: { original:"file.png" },
						html:
						{
							selector: "html > body > img:nth-child(1)",
							tagName: "img",
							attrName: "src",
							tag: '<img src="file.png" longdesc="file.html">'
						}
					},
					{
						url: { original:"file.html" },
						html:
						{
							selector: "html > body > img:nth-child(1)",
							tagName: "img",
							attrName: "longdesc",
							tag: '<img src="file.png" longdesc="file.html">'
						}
					}
				]);
			});
		});
		
		
		
		it("ignores redundant link attributes", function()
		{
			return wrapper('<a href="file.html" href="ignored.html">link</a>').then(links =>
			{
				expect(links.length).to.equal(1);
				expect(links[0]).to.be.like(
				{
					url: { original:"file.html" },
					html:
					{
						attrName: "href",
						tag: '<a href="file.html">'
					}
				});
			});
		});
		
		
		
		it("supports consecutive link elements", function()
		{
			return wrapper('<a href="file1.html">link1</a> <a href="file2.html">link2</a>').then(links =>
			{
				expect(links).to.have.length(2);
				expect(links).to.be.like(
				[
					{
						url: { original:"file1.html" },
						html:
						{
							selector: "html > body > a:nth-child(1)",
							tag: '<a href="file1.html">',
							text: "link1"
						}
					},
					{
						url: { original:"file2.html" },
						html:
						{
							selector: "html > body > a:nth-child(2)",
							tag: '<a href="file2.html">',
							text: "link2"
						}
					}
				]);
			});
		});
		
		
		
		it("supports nonconsecutive link elements", function()
		{
			var html = '<a href="file1.html">link1</a>';
			html += 'content <span>content</span> content';
			html += '<a href="file2.html">link2</a>';
			
			return wrapper(html).then(links =>
			{
				expect(links).to.have.length(2);
				expect(links).to.be.like(
				[
					{
						url: { original:"file1.html" },
						html:
						{
							selector: "html > body > a:nth-child(1)",
							tag: '<a href="file1.html">',
							text: "link1"
						}
					},
					{
						url: { original:"file2.html" },
						html:
						{
							selector: "html > body > a:nth-child(3)",
							tag: '<a href="file2.html">',
							text: "link2"
						}
					}
				]);
			});
		});
		
		
		
		it("supports nested link elements", function()
		{
			return wrapper('<a href="file1.html"><q cite="file2.html">quote</q></a>').then(links =>
			{
				expect(links).to.have.length(2);
				expect(links).to.be.like(
				[
					{
						url: { original:"file1.html" },
						html:
						{
							selector: "html > body > a:nth-child(1)",
							tagName: "a",
							attrName: "href",
							tag: '<a href="file1.html">',
							text: "quote"
						}
					},
					{
						url: { original:"file2.html" },
						html:
						{
							selector: "html > body > a:nth-child(1) > q:nth-child(1)",
							tagName: "q",
							attrName: "cite",
							tag: '<q cite="file2.html">',
							text: "quote"
						}
					}
				]);
			});
		});
		
		
		
		it("supports link elements with nested elements", function()
		{
			return wrapper('<a href="file.html"><span>text</span></a>').then(links =>
			{
				expect(links).to.have.length(1);
				expect(links[0]).to.be.like(
				{
					url: { original:"file.html" },
					html:
					{
						selector: "html > body > a:nth-child(1)",
						tagName: "a",
						attrName: "href",
						tag: '<a href="file.html">',
						text: "text"
					}
				});
			});
		});
		
		
		
		it("supports void elements", function()
		{
			return wrapper('<img src="file.png"> content').then(links =>
			{
				expect(links).to.have.length(1);
				expect(links[0]).to.be.like(
				{
					url: { original:"file.png" },
					html:
					{
						selector: "html > body > img:nth-child(1)",
						tagName: "img",
						attrName: "src",
						tag: '<img src="file.png">',
						text: null
					}
				});
			});
		});
		
		
		
		it("supports detailed selectors and omit nth-child from html and body", function()
		{
			var html = '<html><head><title>title</title></head><body>';
			html += '<div><a href="file1.html">link1</a>';
			html += '<div><a href="file2.html">link2</a></div>';
			html += '<div><a href="file3.html">link3</a></div>';
			html += '<a href="file4.html">link4</a></div>';
			html += '<a href="file5.html">link5</a>';
			html += '</body></html>';
			
			return wrapper(html).then(links =>
			{
				expect(links).to.have.length(5);
				expect(links).to.be.like(
				[
					{
						url: { original:"file1.html" },
						html:
						{
							selector: "html > body > div:nth-child(1) > a:nth-child(1)",
							tag: '<a href="file1.html">',
							text: "link1"
						}
					},
					{
						url: { original:"file2.html" },
						html:
						{
							selector: "html > body > div:nth-child(1) > div:nth-child(2) > a:nth-child(1)",
							tag: '<a href="file2.html">',
							text: "link2"
						}
					},
					{
						url: { original:"file3.html" },
						html:
						{
							selector: "html > body > div:nth-child(1) > div:nth-child(3) > a:nth-child(1)",
							tag: '<a href="file3.html">',
							text: "link3"
						}
					},
					{
						url: { original:"file4.html" },
						html:
						{
							selector: "html > body > div:nth-child(1) > a:nth-child(4)",
							tag: '<a href="file4.html">',
							text: "link4"
						}
					},
					{
						url: { original:"file5.html" },
						html:
						{
							selector: "html > body > a:nth-child(2)",
							tag: '<a href="file5.html">',
							text: "link5"
						}
					}
				]);
			});
		});
		
		
		
		it("supports link attribute source code locations", function()
		{
			const html = '\n\t<a href="file.html">link</a>';
			
			return wrapper(html).then(links =>
			{
				expect(links).to.have.length(1);
				expect(links[0]).to.be.like(
				{
					html:
					{
						location:
						{
							line: 2,
							col: 5,
							startOffset: 5,
							endOffset: 21
						}
					}
				});
				
				const location = links[0].html.location;
				const line = location.line-1;
				const start = (location.startOffset-1) + (location.col-1);
				const end = location.endOffset-1;
				
				expect( html.split("\n")[line].substring(start,end) ).to.equal('="file.html"');
			});
		});
		
		
		
		it("supports <base/>", function()
		{
			return wrapper('<head><base href="/dir/"/></head> <a href="file.html">link</a>').then(links =>
			{
				expect(links).to.have.length(1);
				expect(links[0]).to.be.like(
				{
					url: { original:"file.html" },
					html: { base:"/dir/" }
				});
			});
		});
		
		
		
		it("supports irregular uses of <base/>", function()
		{
			var html = '<base href="/correct/"/>';
			html += '<a href="file.html">link</a>';
			
			return wrapper(html).then(links =>
			{
				expect(links).to.have.length(1);
				expect(links[0]).to.be.like(
				{
					url: { original:"file.html" },
					html: { base:"/correct/" }
				});
			});
		});
		
		
		
		it("ignores multiple uses of <base/>", function()
		{
			var html = '<base href="/first/"/>';
			html += '<head><base href="/ignored1/"/><base href="/ignored2/"/></head>';
			html += '<head><base href="/ignored3/"/></head>';
			html += '<base href="/ignored4/"/>';
			html += '<a href="file.html">link</a>';
			
			return wrapper(html).then(links =>
			{
				expect(links).to.have.length(1);
				expect(links[0]).to.be.like(
				{
					url: { original:"file.html" },
					html: { base:"/first/" }
				});
			});
		});
		
		
		
		it("supports invalid html structure", function()
		{
			var html = '<html><head><title>title</title></head><body>';
			html += '<table>';
			html += '<p><div><a href="file1.html">link<b>1</div></a></b>';
			html += '<tr><td>content</td></tr></table>';
			html += '<a href="file2.html">link2</a>';
			html += '</wtf></body></html>';
			
			return wrapper(html).then(links =>
			{
				expect(links).to.have.length(2);
				expect(links).to.be.like(
				[
					{
						url: { original:"file1.html" },
						html:
						{
							selector: "html > body > div:nth-child(2) > a:nth-child(1)",
							tag: '<a href="file1.html">',
							text: "link1"
						}
					},
					{
						url: { original:"file2.html" },
						html:
						{
							selector: "html > body > a:nth-child(4)",
							tag: '<a href="file2.html">',
							text: "link2"
						}
					}
				]);
			});
		});
		
		
		
		it("fires \"complete\" when no links found", function()
		{
			return wrapper("no links here")
			.then(links => expect(links).to.have.length(0));
		});
	});
});
