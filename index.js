const Router = require('./router')

/**
 * Example of how router can be used in an application
 *  */
addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
    const r = new Router();

    r.get('/hello', () => new Response('Hello worker!'))

    r.get('/code/.*', handleCodeRequest);
    r.get('/risk/.*', handleRiskRequest);
    r.get('/status/.*', handleStatusRequest)
    r.get('/statistics/.*', handleStatisticsRequest);

    const resp = await r.route(request)
    return resp
}

async function handleCodeRequest(request) {


  const countryName = request.url.substring(request.url.lastIndexOf('/') + 1);

  const response = await fetch(`https://restcountries.eu/rest/v2/name/${countryName}`);
  const body = await response.json();

  if (body.status == 404) {
    return new Response(JSON.stringify({
      found: false
    }), {status: 200})  
  }

  const answer = {
    code2: body[0].alpha2Code,
    code3: body[0].alpha3Code,
    found: true
  };

  return new Response(JSON.stringify(answer), {status: 200})
}



/**
 * Respond to the request
 * @param {Request} request
 */
async function handleRiskRequest(request) {
  const countryCode = request.url.substring(request.url.lastIndexOf('/') + 1);

  const response = await fetch(`https://www.travel-advisory.info/api?countrycode=${countryCode}`);
  const body = await response.json();

  const answer = {
    score: body.data[countryCode].advisory.score,
    maxScore: 5
  };

  return new Response(JSON.stringify(answer), {status: 200})
}

async function handleStatusRequest(request) {

    var maxlen = -1;
    var url = request.url;
    if (url.lastIndexOf('?maxlength=')!= -1){
        maxlen = parseInt(url.substring(url.lastIndexOf('=') + 1));
        console.log(maxlen);
        console.log(url.substring(url.lastIndexOf('=') + 1))
        url = url.substring(0,request.url.lastIndexOf('?maxlength='));
    }

    const countryCode = url.substring(url.lastIndexOf('/') + 1);
    const indicators_ids = "/2001,2002,2003,2004,2005,2006,2007,2008,2009,2010,2011,3001,3002,3003,3004,3005,3006,3007,3008,3009,3010,4001,4002,4003,4004,4005,4006,4007,4008,4009,4010";
  
    var response;
    if (countryCode == "help"){
          response = await fetch(`https://reopen.europa.eu/api/covid/v1/eutcdata/data/en/FRA/${indicators_ids}`);
    }
    else{
          response = await fetch(`https://reopen.europa.eu/api/covid/v1/eutcdata/data/en/${countryCode}/${indicators_ids}`);
    }
    
  const body = await response.json();
    
  var res = {};
  var keys = ""
  
  body[0]["indicators"].forEach(function(indicator){
        const indicatorName = getIndicatorName(indicator["indicator_name"]);
        var comment = indicator["comment"];
        if (maxlen != -1){
            maxlen = parseInt(maxlen);
            comment = comment.substr(0,maxlen);
            comment += "...";
        }
        res[indicatorName] = {"value": indicator["value"], "comment" : comment }
        keys += `${indicatorName}<br>`;
})
    if (countryCode == "help"){
  return new Response("<html>"+ keys+'</html>', {status: 200,     headers: { "Content-Type": "text/html" },})
    }
    else {
          return new Response(JSON.stringify(res), {status: 200})

    }
}

function getIndicatorName (humanReadableName) {
  return humanReadableName.replace(new RegExp('[ |?|,|"|\\(|\\)|”|“|\\.|é|-|/]', 'g'), '');
}

// START STATISTICS

async function handleStatisticsRequest(request) {
  const countryCode = request.url.substring(request.url.lastIndexOf('/') + 1);
  const slug = await findCovid197ApiSlug(countryCode);

  const fields = ['confirmed', 'deaths', 'recovered'];
  const answer = {};

  for (let field of fields) {
    answer[`${field}Delta`] = await fetchDeltaCases(slug, field);
  }
  return new Response(JSON.stringify(answer), {status: 200});
}

async function findCovid197ApiSlug (countryCode) {
  const response = await fetch("https://api.covid19api.com/countries");
  const countries = await response.json();

  for (let country of countries) {
    if (country["ISO2"] == countryCode) {
       return country.Slug;
    }
  }  

  return "france";
}

async function fetchDeltaCases (slug, field) {
  const start = dateToString(getTwoWeeksAgo()); // "2020-06-01T00:00:00Z"
  const end = dateToString(new Date()); // "2020-06-15T00:00:00Z"

  const response = await fetch(`https://api.covid19api.com/country/${slug}/status/${field}?from=${start}&to=${end}`);
  const records = await response.json();

  const previous = records[0].Cases;
  const current = records[records.length - 1].Cases;

  return current - previous;
}

function getTwoWeeksAgo () {
  const now = new Date();
  now.setDate(now.getDate() - 14);
  return now;
}

function dateToString (date) {
  const iso = date.toISOString();
  return `${iso.substring(0, iso.indexOf("T"))}T00:00:00Z`;
}

// END STATISTICS
