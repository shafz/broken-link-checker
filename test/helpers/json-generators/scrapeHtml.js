"use strict";
const fs = require("fs");
const path = require("path");

const htmls = 
{
	"<a href>":          '<a href="file.html">link</a>',
	"<area href/>":      '<area href="file.html"/>',
	"<audio src>":       '<audio src="file.ogg"></audio>',
	"<blockquote cite>": '<blockquote cite="file.html">quote</blockquote>',
	"<del cite>":        '<del cite="file.html">deleted</del>',
	"<embed src/>":      '<embed src="file.swf"/>',
	"<form action>":     '<form action="file.html">fields</form>',
	"<iframe longdesc>": '<iframe longdesc="file.html"></iframe>',
	"<iframe src>":      '<iframe src="file.html"></iframe>',
	"<img longdesc/>":   '<img longdesc="file.html"/>',
	"<img src/>":        '<img src="file.png"/>',
	"<input src/>":      '<input src="file.png"/>',
	"<ins cite>":        '<ins cite="file.html">inserted</ins>',
	"<link href/>":      '<link href="file.css"/>',
	"<menuitem icon/>":  '<menuitem icon="file.png"/>',
	
	"<meta http-equiv=\"refresh\" content/>": '<meta http-equiv="refresh" content="5; url=file.html"/>',
	
	"<object data>":     '<object data="file.swf"></object>',
	"<q cite>":          '<q cite="file.html">quote</q>',
	"<script src>":      '<script src="file.js"></script>',
	"<source src/>":     '<source src="file.ogg"/>',
	"<track src/>":      '<track src="file.vtt"/>',
	"<video src>":       '<video src="file.ogg"></video>'
};



function generate()
{
	saveFile( path.normalize( __dirname + "/../json/scrapeHtml.json" ) );
}



function generateData()
{
	const output = {};
	
	for (let i in htmls)
	{
		output[i] = 
		{
			skipOrOnly: "skip",
			html: htmls[i],
			length: 1,
			link:
			{
				// Placeholder values for manual editing
				url:
				{
					original: "",
					resolved: { href:"http://domain.com/" },
					rebased:  { href:"http://domain.com/" },
					redirected: null
				},
				base:
				{
					resolved: { href:"http://domain.com/" },
					rebased:  { href:"http://domain.com/" }
				},
				html:
				{
					selector: "",
					tagName: "",
					attrName: "",
					tag: "",
					text: ""
				}
			}
		};
	}
	
	return output;
}



function generateString()
{
	// Extra line break for unix/git
	return JSON.stringify(generateData(), null, "\t") + "\n";
}



function saveFile(location)
{
	fs.writeFileSync(location, generateString());
	
	console.log("Written to: "+ location);
}



generate();
