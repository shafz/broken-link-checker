"use strict";
const calmcard = require("calmcard");



function matchUrl(url, keywords)
{
	if (url != null)
	{
		const numKeywords = keywords.length;
		
		for (let i=0; i<numKeywords; i++)
		{
			// Check for literal keyword
			if (url.indexOf(keywords[i]) > -1)
			{
				return true;
			}
			// Check for glob'bed keyword
			else if ( calmcard(keywords[i], url) === true )
			{
				return true;
			}
		}
	}
	
	return false;
}



module.exports = matchUrl;
