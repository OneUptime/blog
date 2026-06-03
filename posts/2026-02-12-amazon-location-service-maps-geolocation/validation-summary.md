# Validation Summary: How to Use Amazon Location Service for Maps and Geolocation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Location Service
- Amazon Location Service Maps V2
- Amazon Location Service Places V2
- Amazon Location Service Routes V2
- Amazon Location Service geofences and trackers
- Amazon Cognito identity pools
- Amazon EventBridge
- Amazon CloudWatch
- AWS CLI
- Boto3
- MapLibre GL JS

## Sources Consulted
- Amazon Location Service Maps documentation: https://docs.aws.amazon.com/location/latest/developerguide/maps.html
- Amazon Location Service map styles documentation: https://docs.aws.amazon.com/location/latest/developerguide/map-styles.html
- Amazon Location Service API operations reference: https://docs.aws.amazon.com/location/latest/APIReference/API_Operations.html
- Amazon Location Service data privacy documentation: https://docs.aws.amazon.com/location/latest/developerguide/data-privacy.html
- Amazon Location Service display map documentation: https://docs.aws.amazon.com/location/latest/developerguide/how-to-display-a-map.html
- Amazon Location Service authentication helper documentation: https://docs.aws.amazon.com/location/latest/developerguide/how-to-auth-helper.html
- AWS CLI create-map reference: https://docs.aws.amazon.com/cli/latest/reference/location/create-map.html
- Boto3 Places V2 client documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/geo-places.html
- Boto3 Places V2 geocode documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/geo-places/client/geocode.html
- Boto3 Places V2 reverse_geocode documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/geo-places/client/reverse_geocode.html
- Boto3 Routes V2 client documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/geo-routes.html
- Boto3 Routes V2 calculate_routes documentation: https://docs.aws.amazon.com/botocore/latest/reference/services/geo-routes/client/calculate_routes.html
- AWS CLI calculate-route reference: https://docs.aws.amazon.com/cli/latest/reference/location/calculate-route.html
- Boto3 put_geofence documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/location/client/put_geofence.html
- Boto3 batch_update_device_position documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/location/client/batch_update_device_position.html
- Amazon Location Service EventBridge documentation: https://docs.aws.amazon.com/location/latest/developerguide/location-events.html
- Amazon Location Service CloudWatch documentation: https://docs.aws.amazon.com/location/latest/developerguide/cloudwatch.html

## Issues Found
- The map example used the older `aws location create-map` resource workflow, `VectorEsriNavigation`, and the `/maps/v0/maps/.../style-descriptor` endpoint. AWS now documents Maps V2 as the current API, so I updated the section to use current map styles and the `/v2/styles/{style}/descriptor` URL.
- The MapLibre example used older CDN version references and manually assigned `transformRequest`. I updated it to the current documented MapLibre/Auth Helper pattern using MapLibre GL JS 5.x, the auth helper package, and `...authHelper.getMapAuthenticationOptions()`.
- The post said to grant `geo:GetMap*` for map rendering. That applies to the older Maps API, so I changed the guidance to Maps V2 actions such as `geo-maps:GetStyleDescriptor`, `geo-maps:GetTile`, `geo-maps:GetSprites`, and `geo-maps:GetGlyphs`.
- The Places examples used `create-place-index`, `boto3.client('location')`, `search_place_index_for_text`, and `search_place_index_for_position`, which are previous-generation Places APIs. I updated them to Places V2 with `boto3.client('geo-places')`, `geocode`, and `reverse_geocode`.
- The Routes examples used `create-route-calculator` and `calculate_route`, which are previous-generation Routes APIs. I updated them to Routes V2 with `boto3.client('geo-routes')` and `calculate_routes`, including the current response fields for distance, duration, legs, and travel steps.
- The original route calculator used Esri for a San Francisco to Los Angeles route, which would exceed the documented 400 km Esri limit in the previous Routes API. Moving the example to Routes V2 removes that invalid provider-specific example.
- The polygon geofence was closed but its exterior ring was listed clockwise. AWS requires exterior polygon rings to be counter-clockwise, so I reordered the vertices.
- The tracker position update passed `SampleTime` as a string. Boto3 documents this parameter as a `datetime`, so I changed it to a timezone-aware Python `datetime`.
- The pricing claims overstated predictability and relative cost. I narrowed the wording to usage-based pricing and noted that cost can be lower for many applications rather than claiming it is significantly lower for most applications.
- The privacy wording said broadly that "the data stays in your account." AWS documents this specifically for sensitive tracking and geofencing data, while provider queries are anonymized, so I narrowed the sentence.

## Review Notes
Geofence geometry, tracker association, EventBridge event matching for `Location Geofence Event` with `EventType: ENTER`, coordinate ordering as `[longitude, latitude]`, and CloudWatch `CallCount` / `ErrorCount` monitoring are consistent with AWS documentation. The post could later mention API keys as an alternative to Cognito for browser map rendering, but the Cognito approach remains valid.
