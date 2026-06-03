# Validation Summary: How to Build a Geospatial Application on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Location Service
- Amazon Location Places API
- Amazon Location Routes API
- Amazon Location Trackers and Geofences
- Amazon EventBridge
- AWS Lambda
- Amazon API Gateway
- Amazon DynamoDB
- DynamoDB Geo library
- AWS SDK for JavaScript v3
- AWS CloudFormation

## Sources Consulted
- AWS CloudFormation `AWS::Location::Map`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-location-map.html
- AWS CloudFormation `AWS::Location::Tracker`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-location-tracker.html
- AWS CloudFormation `AWS::Location::TrackerConsumer`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-location-trackerconsumer.html
- AWS CloudFormation `AWS::Lambda::Permission`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-lambda-permission.html
- Amazon Location Places API `Geocode`: https://docs.aws.amazon.com/location/latest/APIReference/API_geoplaces_Geocode.html
- Amazon Location Places API `ReverseGeocode`: https://docs.aws.amazon.com/location/latest/APIReference/API_geoplaces_ReverseGeocode.html
- Amazon Location Routes API `CalculateRoutes`: https://docs.aws.amazon.com/location/latest/APIReference/API_CalculateRoutes.html
- Amazon Location geofencing `PutGeofence`: https://docs.aws.amazon.com/location/previous/APIReference/API_PutGeofence.html
- AWS SDK for JavaScript v3 `@aws-sdk/client-geo-places`: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/geo-places/
- AWS SDK for JavaScript v3 `@aws-sdk/client-geo-routes`: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/geo-routes/
- `dynamodb-geo-v3` package documentation: https://www.npmjs.com/package/dynamodb-geo-v3
- AWS DynamoDB Geo library table structure notes: https://aws.amazon.com/blogs/mobile/geo-library-for-amazon-dynamodb-part-1-table-structure/
- Amazon Location Service pricing: https://aws.amazon.com/location/pricing/

## Issues Found
- Removed obsolete `PricingPlan: RequestBasedUsage` fields from the CloudFormation Location resources. Current CloudFormation resource schemas for tracker, map, geofence collection, and related resources do not use that property.
- Removed the place index and route calculator from the setup template because current Places and Routes v2 API calls do not require those v1 resources.
- Added `EventBridgeEnabled: true` to the tracker and added an `AWS::Location::TrackerConsumer` association so tracker updates are evaluated against the geofence collection.
- Added `AWS::Lambda::Permission` for the EventBridge rule target so EventBridge can invoke the notification Lambda.
- Updated the DynamoDB Geo example from deprecated AWS SDK for JavaScript v2 usage to the SDK v3-compatible `dynamodb-geo-v3` package and removed the v2 `.promise()` call.
- Fixed DynamoDB Geo result parsing to parse the stored `geoJson` JSON string instead of splitting it as comma-separated text.
- Corrected the `hashKeyLength` explanation. It is the number of leading digits from the 64-bit geohash used as the DynamoDB partition key, not a fixed grid size in kilometers.
- Updated geocoding and reverse geocoding examples from older `SearchPlaceIndexForText` and `SearchPlaceIndexForPosition` operations to current Places v2 `Geocode` and `ReverseGeocode` operations.
- Updated route calculation from older `CalculateRoute` to current Routes v2 `CalculateRoutes`, including the current request and response fields.
- Replaced stale fixed pricing examples and a fixed monthly estimate with a usage-based pricing description and a reference to AWS pricing tools.

## Review Notes
The remaining examples are illustrative Lambda handlers and do not include production concerns such as IAM policies, API Gateway event validation, error handling, authentication, or DynamoDB table creation. The post now uses current AWS SDK v3 package names for the examples that were outdated.
