"use strict";
var tags = require("../../lib/internal/tags");



function tagsString(filterLevel, url)
{
	const filteredTags = tags[filterLevel];
	var html = "";
	
	for (let tagName in filteredTags)
	{
		html += '<'+tagName;
		
		let tag = filteredTags[tagName];
		
		for (let attrName in tag)
		{
			// Special case for `<meta http-equiv="refresh" content="5; url=redirect.html">`
			if (tagName==="meta" && attrName==="content")
			{
				html += ' http-equiv="refresh" content="5; url=';
			}
			else
			{
				html += ' '+attrName+'="';
			}
			
			html += url+'"';
		}
		
		html += '>link</'+tagName+'>';
	}
	
	return html;
}



module.exports = tagsString;
