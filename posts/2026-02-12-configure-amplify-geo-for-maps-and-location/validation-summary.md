# Validation Summary: How to Configure Amplify Geo for Maps and Location

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Amplify Gen 1 CLI
- Amplify JavaScript Geo (`aws-amplify`, `@aws-amplify/geo`)
- Amazon Location Service
- MapLibre GL JS
- `maplibre-gl-js-amplify`
- React and TypeScript
- Browser Geolocation API

## Sources Consulted
- AWS Amplify Gen 1 React: Set up Amplify Geo - https://docs.amplify.aws/gen1/react/build-a-backend/more-features/geo/set-up-geo/
- AWS Amplify Gen 1 React: Configure maps - https://docs.amplify.aws/gen1/react/build-a-backend/more-features/geo/configure-maps/
- AWS Amplify Gen 1 React: Work with maps - https://docs.amplify.aws/gen1/react/build-a-backend/more-features/geo/maps/
- AWS Amplify Gen 1 React: Work with location search - https://docs.amplify.aws/gen1/react/build-a-backend/more-features/geo/location-search/
- AWS Amplify Gen 1 React: Work with geofences - https://docs.amplify.aws/gen1/react/prev/build-a-backend/more-features/geo/geofences/
- AWS Amplify Gen 1 React: Use Amazon Location Service SDK - https://docs.amplify.aws/gen1/react/build-a-backend/more-features/geo/amazon-location-sdk/
- Amazon Location Service map style configuration - https://docs.aws.amazon.com/location/previous/APIReference/API_MapConfiguration.html
- Amazon Location Service pricing model - https://docs.aws.amazon.com/location/latest/developerguide/pricing.html
- npm package metadata for `@aws-amplify/geo`, `aws-amplify`, `maplibre-gl-js-amplify`, `maplibre-gl`, and `react-map-gl`

## Issues Found
- The post claimed Amplify Geo directly provides route calculation. Amplify Geo supports common map, search, and geofence use cases, while unsupported Amazon Location features should be accessed through the Amazon Location Service SDK. Updated the feature list and diagram to describe SDK access for routes and trackers.
- The dependency command installed unversioned `maplibre-gl`, whose latest npm version is outside `maplibre-gl-js-amplify`'s supported peer dependency range. Updated the install commands to use `maplibre-gl@2`.
- The React wrapper installation was presented as generally required for React, but the shown examples use `createMap` directly. Clarified that `react-map-gl` is only needed when using Amplify UI's React `MapView` component.
- The manual `Amplify.configure` example used an incorrect current Geo config shape (`AmazonLocationService` and `search_indices`). Replaced it with the documented approach of importing the generated `amplifyconfiguration.json` and passing it to `Amplify.configure`.
- The reverse geocoding code treated `Geo.searchByCoordinates()` as returning an array. Current Amplify Geo types and documentation describe a single place object. Updated the example to handle a single result.
- The user-location snippet called `drawPoints` without importing it and used object literals that can infer overly broad TypeScript string types. Added the import and `as const` annotations for the GeoJSON feature.
- The map styles table used `VectorHereBerlin`, which AWS documents as deprecated. Replaced it with `VectorHereContrast`.
- The pricing section made an absolute cost comparison and loosely described the free tier. Updated it to a conditional comparison and noted that the 3-month free trial is subject to usage quotas.

## Review Notes
- The tutorial is centered on the Amplify Gen 1 CLI workflow. Amplify Gen 2 has a different backend definition flow, so future updates should explicitly call out Gen 1 if the post remains CLI-based.
- Amazon Location Service has newer AWS Map Styles in addition to provider-specific legacy styles. The provider-specific styles shown remain relevant for Amplify CLI map resources, but readers should check current regional availability and service terms before production use.
