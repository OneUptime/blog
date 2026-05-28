# Validation Summary: Insert Server-Side Ads into Live Streams Using Google Cloud Video Stitcher API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Video Stitcher API
- Google Cloud Live Stream API
- Google Cloud Media CDN / CDN URL signing
- Python Google Cloud client libraries
- hls.js
- HLS/DASH live streaming
- VAST/VMAP ad decisioning
- SCTE-35 ad markers

## Sources Consulted
- Google Cloud Video Stitcher API live config documentation: https://docs.cloud.google.com/video-stitcher/docs/how-to/managing-live-configs
- Google Cloud Video Stitcher API live session documentation: https://docs.cloud.google.com/video-stitcher/docs/how-to/managing-live-sessions
- Google Cloud Video Stitcher API create slate sample: https://cloud.google.com/video-stitcher/docs/samples/videostitcher-create-slate
- Google Cloud Video Stitcher API create CDN key sample: https://docs.cloud.google.com/video-stitcher/docs/samples/videostitcher-create-cdn-key
- Google Cloud Video Stitcher API REST CdnKey reference: https://docs.cloud.google.com/video-stitcher/docs/reference/rest/v1/projects.locations.cdnKeys
- Google Cloud Video Stitcher API REST Slate reference: https://docs.cloud.google.com/video-stitcher/docs/reference/rest/v1/projects.locations.slates
- Google Cloud Video Stitcher API list live ad tag details sample: https://cloud.google.com/video-stitcher/docs/samples/videostitcher-list-live-ad-tag-details
- Google Cloud Video Stitcher Python LiveAdTagDetail reference: https://docs.cloud.google.com/python/docs/reference/videostitcher/latest/google.cloud.video.stitcher_v1.types.LiveAdTagDetail
- Google Cloud Video Stitcher Python ResponseMetadata reference: https://docs.cloud.google.com/python/docs/reference/videostitcher/latest/google.cloud.video.stitcher_v1.types.ResponseMetadata
- Google Cloud Live Stream API channel events documentation: https://docs.cloud.google.com/livestream/docs/how-to/create-channel-events
- Google Cloud Video Stitcher API AdTracking reference: https://docs.cloud.google.com/video-stitcher/docs/reference/rest/v1/AdTracking

## Issues Found
- The prerequisites and slate example implied a `gs://` Cloud Storage URI could be passed directly as the slate source. The current API expects a URI that fetches an MP4 video with at least one audio track, so the example was changed to an HTTPS Cloud Storage URL and the prerequisite wording was updated.
- The CDN key helper claimed to register a Media CDN or Akamai key, but the code only constructs a `MediaCdnKey`. The docstring was narrowed to Media CDN.
- The sample ad tag URI used `[dur]` and `[podnum]` macros, but the live session only supplied `user_segment` and `geo` in `ad_tag_macros`. The ad tag URI was changed to use matching macro names.
- The ad tracking section claimed completion-rate reporting and referenced `response_metadata.ad_count`, which is not present in the current `ResponseMetadata` type. The wording and code now show available ad request metadata fields such as status code and response size.

## Review Notes
- Video Stitcher documentation states that API access may require contacting Google Cloud sales or an account representative; the post now avoids implying that a `gcloud services enable` command alone is always sufficient.
- Live ad tag detail resources are available for live sessions that do not implement Google Ad Manager ad insertion, so GAM-specific integrations may need different metadata handling.
