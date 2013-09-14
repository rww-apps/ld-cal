var proxy_template = "https://rww.io/proxy?uri={uri}";

// ----- USER INFO -------
function userInfo (webid, baseId) {
    var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
    var FOAF = $rdf.Namespace("http://xmlns.com/foaf/0.1/");
    var WAPP = $rdf.Namespace("http://my-profile.eu/ns/webapp#");
    var g = $rdf.graph();
    var f = $rdf.fetcher(g);
    // add CORS proxy
    $rdf.Fetcher.crossSiteProxyTemplate=proxy_template;
    
    var docURI = webid.slice(0, webid.indexOf('#'));
    var webidRes = $rdf.sym(webid);
    
    // fetch user data
    f.nowOrWhenFetched(docURI,undefined,function(){
        // export the user graph
        mygraph = g;
        // get some basic info
        var name = g.any(webidRes, FOAF('name'));
        var pic = g.any(webidRes, FOAF('img'));
        var depic = g.any(webidRes, FOAF('depiction'));
       
        if (name == undefined)
            name = 'Unknown';
        else
            name = name.value;

        if (name.length > 22)
            name = name.slice(0, 18)+'...';

        if (pic == undefined) {
            if (depic)
                pic = depic.value;
            else
                pic = 'https://rww.io/common/images/nouser.png';
        } else {
            pic = pic.value;
        }
        
        // main divs      
        var html = $('<div class="user left">Welcome, <strong>'+name+'</strong></div><div class="user-pic right"><img src="'+pic+'" title="'+name+'" class="login-photo img-border" /></div>');
        $('#'+baseId).append(html);
    });
}
