# How to Implement Address Search and Geocoding with Azure Maps Search API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Maps, Search API, Geocoding, Reverse Geocoding, Address Search, Geospatial, REST API

Description: A practical guide to implementing address search, geocoding, and reverse geocoding using the Azure Maps Search API with code examples in JavaScript and Python.

---

Geocoding is the process of converting a human-readable address into geographic coordinates (latitude and longitude). Reverse geocoding does the opposite - it takes coordinates and returns the nearest address. These operations are fundamental to any location-based application, from delivery route planning to store locators to asset tracking dashboards. Azure Maps provides a Search API that handles geocoding, reverse geocoding, autocomplete, and batch processing in a single service.

This guide covers how to use the Azure Maps Search API for common geocoding tasks, with examples in both JavaScript (for browser-based apps) and Python (for server-side processing).

## Getting Started

You need an Azure Maps account with a subscription key. If you do not have one yet, create it with the Azure CLI.

```bash
az maps account create \
  --name my-maps-account \
  --resource-group maps-rg \
  --kind Gen2 \
  --sku G2

# Retrieve the subscription key

az maps account keys list \
  --name my-maps-account \
  --resource-group maps-rg \
  --query primaryKey -o tsv
```

The Search API is a REST service. You can call it from any language that can make HTTP requests. The base URL is `https://atlas.microsoft.com`.

## Forward Geocoding: Address to Coordinates

The most common operation is turning an address into coordinates. The Geocoding API does this.

```python
# geocode.py - Forward geocoding with Azure Maps Search API
import requests

AZURE_MAPS_KEY = "your-subscription-key"
BASE_URL = "https://atlas.microsoft.com/geocode"

def geocode_address(address: str) -> dict:
    """Convert an address string to geographic coordinates."""
    params = {
        "api-version": "2026-01-01",
        "query": address,
        "top": 1  # Return only the best match
    }
    headers = {"subscription-key": AZURE_MAPS_KEY}

    response = requests.get(BASE_URL, params=params, headers=headers)
    response.raise_for_status()
    data = response.json()

    if data.get("features"):
        result = data["features"][0]
        properties = result["properties"]
        lon, lat = result["geometry"]["coordinates"]
        return {
            "address": properties["address"]["formattedAddress"],
            "latitude": lat,
            "longitude": lon,
            "confidence": properties.get("confidence"),
            "type": properties["type"]
        }
    return None

# Example usage
result = geocode_address("1 Microsoft Way, Redmond, WA 98052")
if result:
    print(f"Address: {result['address']}")
    print(f"Coordinates: {result['latitude']}, {result['longitude']}")
    print(f"Confidence: {result['confidence']}")
```

The API returns a confidence value that indicates how well the input matches the result. Use this value together with the match codes to decide whether the result is precise enough for your application.

## Reverse Geocoding: Coordinates to Address

When you have GPS coordinates and need a human-readable address, use the reverse search endpoint.

```python
# reverse_geocode.py - Reverse geocoding
import requests

AZURE_MAPS_KEY = "your-subscription-key"
BASE_URL = "https://atlas.microsoft.com/reverseGeocode"

def reverse_geocode(lat: float, lon: float) -> dict:
    """Convert geographic coordinates to a street address."""
    params = {
        "api-version": "2026-01-01",
        "coordinates": f"{lon},{lat}"
    }
    headers = {"subscription-key": AZURE_MAPS_KEY}

    response = requests.get(BASE_URL, params=params, headers=headers)
    response.raise_for_status()
    data = response.json()

    if data.get("features"):
        addr = data["features"][0]["properties"]["address"]
        admin_districts = addr.get("adminDistricts", [])
        return {
            "streetAddress": addr.get("addressLine", ""),
            "city": addr.get("locality", ""),
            "state": admin_districts[0].get("shortName", "") if admin_districts else "",
            "postalCode": addr.get("postalCode", ""),
            "country": addr.get("countryRegion", {}).get("name", ""),
            "freeformAddress": addr.get("formattedAddress", "")
        }
    return None

# Example usage
result = reverse_geocode(47.6062, -122.3321)
if result:
    print(f"Address: {result['freeformAddress']}")
    print(f"City: {result['city']}, {result['state']}")
```

## Flexible Search: Addresses and Places

The geocoding endpoint handles free-form address and place queries. This is what you want to use for search boxes where users can type a final address or place name.

```python
# flexible_search.py - Flexible search for addresses and places
import requests

AZURE_MAPS_KEY = "your-subscription-key"
BASE_URL = "https://atlas.microsoft.com/geocode"

def flexible_search(query: str, lat: float = None, lon: float = None) -> list:
    """Search for addresses and places.

    Optionally bias results toward a specific location.
    """
    params = {
        "api-version": "2026-01-01",
        "query": query,
        "top": 10
    }
    headers = {"subscription-key": AZURE_MAPS_KEY}

    # Bias results toward a location if provided
    if lat is not None and lon is not None:
        params["coordinates"] = f"{lon},{lat}"

    response = requests.get(BASE_URL, params=params, headers=headers)
    response.raise_for_status()
    data = response.json()

    results = []
    for item in data.get("features", []):
        properties = item["properties"]
        address = properties.get("address", {})
        lon, lat = item["geometry"]["coordinates"]
        results.append({
            "name": properties.get("name", address.get("formattedAddress", "")),
            "address": address.get("formattedAddress", ""),
            "latitude": lat,
            "longitude": lon,
            "type": properties["type"],
            "confidence": properties.get("confidence")
        })

    return results

# Search for a place near Seattle center
results = flexible_search("Space Needle", lat=47.6062, lon=-122.3321)
for place in results:
    print(f"{place['name']} - {place['address']} (confidence: {place['confidence']})")
```

## Building a Search Autocomplete in JavaScript

For web applications, you want to provide search suggestions as the user types. Here is how to build an autocomplete using the Azure Maps SDK.

```javascript
// search-autocomplete.js - Search suggestions as the user types

// Throttle function to limit API calls during typing
function throttle(func, delay) {
    let lastCall = 0;
    return function(...args) {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            return func(...args);
        }
    };
}

// Search for address suggestions
async function searchSuggestions(query) {
    if (query.length < 3) return []; // Don't search for very short queries

    const url = new URL('https://atlas.microsoft.com/geocode:autocomplete');
    url.searchParams.set('api-version', '2026-01-01');
    url.searchParams.set('query', query);
    url.searchParams.set('top', '5');
    url.searchParams.set('coordinates', '-122.3321,47.6062'); // Bias suggestions near Seattle

    const response = await fetch(url, {
        headers: {
            'subscription-key': 'YOUR_AZURE_MAPS_KEY'
        }
    });
    const data = await response.json();

    return data.features.map(function(result) {
        const address = result.properties.address || {};
        return {
            text: address.formattedAddress || result.properties.name || query,
            type: result.properties.type
        };
    });
}

async function geocodeSelectedAddress(address) {
    const url = new URL('https://atlas.microsoft.com/geocode');
    url.searchParams.set('api-version', '2026-01-01');
    url.searchParams.set('query', address);
    url.searchParams.set('top', '1');

    const response = await fetch(url, {
        headers: {
            'subscription-key': 'YOUR_AZURE_MAPS_KEY'
        }
    });
    const data = await response.json();

    if (!data.features.length) return null;
    return data.features[0].geometry.coordinates;
}

// Wire up the search input
const searchInput = document.getElementById('search-input');
const suggestionsList = document.getElementById('suggestions');

// Throttled handler - search at most every 300ms
const handleInput = throttle(async function(event) {
    const query = event.target.value;
    const suggestions = await searchSuggestions(query);

    // Clear previous suggestions
    suggestionsList.innerHTML = '';

    // Display new suggestions
    suggestions.forEach(function(suggestion) {
        const li = document.createElement('li');
        li.textContent = suggestion.text;
        li.addEventListener('click', async function() {
            // When user selects a suggestion, center the map on it
            searchInput.value = suggestion.text;
            suggestionsList.innerHTML = '';
            const position = await geocodeSelectedAddress(suggestion.text);
            if (position) {
                map.setCamera({
                    center: position,
                    zoom: 15
                });
            }
        });
        suggestionsList.appendChild(li);
    });
}, 300);

searchInput.addEventListener('input', handleInput);
```

## Batch Geocoding

If you need to geocode many addresses at once (for example, importing a CSV of customer addresses), use the batch search endpoint.

```python
# batch_geocode.py - Geocode multiple addresses in a single request
import requests

AZURE_MAPS_KEY = "your-subscription-key"
BATCH_URL = "https://atlas.microsoft.com/geocode:batch"

def batch_geocode(addresses: list) -> list:
    """Geocode up to 100 addresses in a single batch request."""
    # Build the batch request body
    batch_items = []
    for address in addresses:
        batch_items.append({
            "query": address,
            "top": 1
        })

    payload = {
        "batchItems": batch_items
    }

    params = {
        "api-version": "2026-01-01"
    }
    headers = {"subscription-key": AZURE_MAPS_KEY}

    response = requests.post(BATCH_URL, params=params, json=payload, headers=headers)
    response.raise_for_status()
    return parse_batch_results(response.json())

def parse_batch_results(data):
    """Parse batch response into a clean format."""
    results = []
    for item in data.get("batchItems", []):
        if "features" in item and item["features"]:
            result = item["features"][0]
            lon, lat = result["geometry"]["coordinates"]
            results.append({
                "address": result["properties"]["address"]["formattedAddress"],
                "latitude": lat,
                "longitude": lon
            })
        else:
            results.append(None)  # Geocoding failed for this address
    return results

# Example usage
addresses = [
    "1 Microsoft Way, Redmond, WA",
    "350 5th Avenue, New York, NY",
    "1600 Pennsylvania Avenue NW, Washington, DC",
    "1 Apple Park Way, Cupertino, CA"
]

results = batch_geocode(addresses)
for address, result in zip(addresses, results):
    if result:
        print(f"{address} -> ({result['latitude']}, {result['longitude']})")
    else:
        print(f"{address} -> FAILED")
```

## Structured vs. Unstructured Search

The Search API supports both unstructured queries (a single string) and structured queries (separate fields for street, city, state, country). Structured queries produce more accurate results because the API does not have to guess which part of the string is the city vs. the state.

```python
# Structured search - more accurate for known address components
def structured_geocode(street: str, city: str, state: str, country: str = "US") -> dict:
    url = "https://atlas.microsoft.com/geocode"
    params = {
        "api-version": "2026-01-01",
        "addressLine": street,
        "locality": city,
        "adminDistrict": state,
        "countryRegion": country,
        "top": 1
    }
    headers = {"subscription-key": AZURE_MAPS_KEY}

    response = requests.get(url, params=params, headers=headers)
    response.raise_for_status()
    data = response.json()

    if data.get("features"):
        result = data["features"][0]
        lon, lat = result["geometry"]["coordinates"]
        return {
            "latitude": lat,
            "longitude": lon,
            "freeformAddress": result["properties"]["address"]["formattedAddress"]
        }
    return None
```

## Error Handling and Rate Limits

The Azure Maps Search API has rate limits based on your pricing tier and operation type. For example, Gen2 allows higher limits for single Search requests than the older Gen1 S0 tier. Handle rate limiting gracefully.

```python
import time

def geocode_with_retry(address: str, max_retries: int = 3) -> dict:
    """Geocode with retry logic for rate limiting."""
    for attempt in range(max_retries):
        headers = {"subscription-key": AZURE_MAPS_KEY}
        response = requests.get(BASE_URL, params={
            "api-version": "2026-01-01",
            "query": address,
            "top": 1
        }, headers=headers)

        if response.status_code == 429:
            # Rate limited - wait and retry
            retry_after = int(response.headers.get("Retry-After", 1))
            print(f"Rate limited, waiting {retry_after}s (attempt {attempt + 1})")
            time.sleep(retry_after)
            continue

        response.raise_for_status()
        data = response.json()

        if data.get("features"):
            result = data["features"][0]
            lon, lat = result["geometry"]["coordinates"]
            return {
                "latitude": lat,
                "longitude": lon
            }
        return None

    raise Exception(f"Failed to geocode after {max_retries} attempts")
```

## Wrapping Up

The Azure Maps Search API is a solid geocoding solution that handles forward geocoding, reverse geocoding, autocomplete, and batch processing through a consistent REST interface. For web applications, pair it with the Azure Maps Web SDK for autocomplete search experiences. For server-side batch processing, use the batch endpoint to geocode up to 100 addresses in a single request. The key decision is whether to use unstructured search (great for user-facing search boxes) or structured search (better for programmatic geocoding of clean address data). Choose based on the quality of your input data and the tolerance for ambiguity in your use case.
