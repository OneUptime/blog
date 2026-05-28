# Validation Summary: How to Configure App Engine app.yaml Scaling Settings to Control Instance Count

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google App Engine Standard environment
- Google App Engine Flexible environment
- App Engine app.yaml scaling configuration
- Automatic scaling
- Basic scaling
- Manual scaling
- Python and Node.js App Engine runtimes

## Sources Consulted
- Google Cloud App Engine Standard app.yaml reference: https://docs.cloud.google.com/appengine/docs/standard/reference/app-yaml
- Google Cloud App Engine Standard environment overview and instance classes: https://docs.cloud.google.com/appengine/docs/standard
- Google Cloud App Engine Standard instance management and scaling types: https://docs.cloud.google.com/appengine/docs/standard/how-instances-are-managed
- Google Cloud App Engine Flexible app.yaml reference: https://docs.cloud.google.com/appengine/docs/flexible/reference/app-yaml
- Google Cloud App Engine Flexible for Standard users guide: https://docs.cloud.google.com/appengine/docs/flexible/flexible-for-standard-users
- Google Cloud App Engine pricing: https://cloud.google.com/appengine/pricing
- Google Cloud App Engine Standard Python 3 runtime documentation: https://docs.cloud.google.com/appengine/docs/standard/python3/runtime
- Google Cloud App Engine Standard Node.js runtime documentation: https://cloud.google.com/appengine/docs/standard/nodejs/runtime

## Issues Found
- The post said App Engine Flexible only supports automatic scaling, with manual scaling framed as an aside. Updated the wording to state that Flexible supports automatic and manual scaling and uses different scaling fields than Standard.
- The post described B instance classes as billing per hour rather than per request. Current Google Cloud pricing describes Standard environment instance classes in instance-hours, with B classes reported as Backend Instances and F classes reported as Frontend Instances. Updated the sentence accordingly.
- The instance class examples listed outdated memory values for F1, F2, and F4_1G. Updated them to the current Standard environment values: F1 384MB, F2 768MB, and F4_1G 3072MB.

## Review Notes
The app.yaml scaling field names and values shown for Standard automatic, basic, and manual scaling are consistent with the current App Engine Standard app.yaml reference. The Flexible automatic scaling example uses current field names. The examples use supported Python and Node.js runtime naming patterns.
