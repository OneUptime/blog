# Validation Summary: How to Configure Atlas Maintenance Windows

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas
- MongoDB Atlas Administration API (v1.0)
- cURL (for API examples)

## Sources Consulted
- MongoDB Atlas Maintenance Window API documentation: https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v1/#tag/Maintenance-Windows
- MongoDB Atlas Configure Maintenance Window documentation: https://www.mongodb.com/docs/atlas/tutorial/configure-maintenance-window/

## Issues Found

1. **Incorrect endpoint for triggering immediate maintenance (Line 63-67):** The post used a `POST` request to `/maintenanceWindow/autoDefer` to trigger immediate maintenance. The `/autoDefer` endpoint is for enabling automatic deferral of maintenance events, not for triggering them immediately. The correct approach is to send a `PATCH` request to `/maintenanceWindow` with `"startASAP": true` in the request body. Fixed the curl command accordingly.

2. **Misleading claim about 4-hour minimum window (Line 76):** The post recommended "Use a 4-hour minimum window to allow rolling restarts across replica set members." Atlas maintenance windows do not have a configurable duration — you only set a day and start hour. Atlas manages the rolling restart process automatically. Updated the bullet point to clarify this.

## Review Notes
- The `dayOfWeek` values (1 = Sunday through 7 = Saturday) and `hourOfDay` range (0-23 UTC) are correct per the Atlas API documentation.
- The defer endpoint and its behavior (defer by one week, max two deferrals) are accurate.
- The GET endpoint for checking current maintenance window configuration and the example response are accurate.
- The Atlas v2.0 API is now available and may eventually supersede v1.0 endpoints used in this post, but v1.0 remains functional.
