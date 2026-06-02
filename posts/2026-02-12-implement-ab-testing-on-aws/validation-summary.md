# Validation Summary: How to Implement A/B Testing on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CloudWatch Evidently
- AWS AppConfig
- Amazon CloudFront
- Lambda@Edge
- AWS SDK for JavaScript v3
- Amazon CloudWatch custom metrics
- JavaScript statistical calculations

## Sources Consulted
- AWS Cloud Operations Blog: Support for Amazon CloudWatch Evidently ending soon - https://aws.amazon.com/blogs/mt/support-for-amazon-cloudwatch-evidently-ending-soon/
- AWS General Reference: Services in Full Shutdown - https://docs.aws.amazon.com/general/latest/gr/full_shutdown_services.html
- AWS SDK for JavaScript Evidently API reference - https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Evidently.html
- CloudWatch Evidently API reference: PutProjectEvents - https://docs.aws.amazon.com/cloudwatchevidently/latest/APIReference/API_PutProjectEvents.html
- Amazon CloudFront Developer Guide: Lambda@Edge event structure - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-event-structure.html
- Amazon CloudFront Developer Guide: Lambda@Edge example functions - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-examples.html
- Amazon CloudWatch API Reference: PutMetricData - https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_PutMetricData.html

## Issues Found
- CloudWatch Evidently was presented as a current managed A/B testing service. AWS discontinued CloudWatch Evidently on October 17, 2025, so the post now states that the Evidently section is historical and points new feature-flag launches to AWS AppConfig with analytics or a data warehouse for experiment measurement.
- The `CreateExperimentCommand` example used `treatmentNames`, which is not a valid Evidently `CreateExperiment` parameter, and omitted the required `treatments` array. Replaced it with `treatments` entries that map each treatment to the `checkout-flow` feature and variation.
- The `EvaluateFeatureCommand` example assumed a variation and value would always be returned. Added a guard for the case where no variation is assigned.
- The CloudWatch custom metric helper used `Unit: 'Count'` for all metrics, including revenue. Added a `unit` parameter and changed the revenue example to use `Unit: 'None'`.
- The summary and statistical significance text claimed Evidently currently handles analysis automatically. Updated those claims to avoid recommending an unavailable service.

## Review Notes
The Lambda@Edge request/response examples use the documented CloudFront event shape and header array format. For a production CloudFront setup, the cache policy and behavior configuration should be reviewed so experiment routing and cookies interact correctly with caching, but the code pattern shown is technically plausible.
