# Validation Summary: How to Optimize AI Training Pipeline Performance with Parallelstore

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Parallelstore
- Google Compute Engine A3 GPU VMs
- NVIDIA H100 GPUs
- DAOS / DFuse / libioil
- Cloud Storage
- Cloud Monitoring
- PyTorch DataLoader and DistributedSampler
- WebDataset

## Sources Consulted
- Google Cloud Parallelstore overview: https://docs.cloud.google.com/parallelstore/docs/overview
- Google Cloud Parallelstore create instance guide: https://docs.cloud.google.com/parallelstore/docs/create-instance
- Google Cloud Parallelstore Compute Engine connection guide: https://docs.cloud.google.com/parallelstore/docs/connect-from-compute-engine
- Google Cloud Parallelstore Cloud Storage transfer guide: https://cloud.google.com/parallelstore/docs/transfer-data
- Google Cloud Parallelstore performance considerations: https://docs.cloud.google.com/parallelstore/docs/performance
- Google Cloud Parallelstore interception library guide: https://docs.cloud.google.com/parallelstore/docs/interception-library
- Google Cloud Parallelstore monitoring guide: https://docs.cloud.google.com/parallelstore/docs/monitoring
- Google Cloud Compute Engine accelerator-optimized machine family docs: https://docs.cloud.google.com/compute/docs/accelerator-optimized-machines
- Google Cloud Compute Engine GPUDirect A3 guide: https://docs.cloud.google.com/compute/docs/gpus/gpudirect
- Google Cloud Deep Learning VM image guide: https://docs.cloud.google.com/deep-learning-vm/docs/images
- PyTorch DataLoader documentation: https://docs.pytorch.org/docs/stable/data.html
- WebDataset API documentation: https://webdataset.github.io/webdataset/webdataset/

## Issues Found
- Corrected A3-highgpu-8g specifications from 1.9 TB RAM and 200 Gbps networking to 1,872 GB RAM and up to 1,000 Gbps networking for that machine type.
- Replaced the outdated/deprecated Deep Learning VM image family with the current CUDA 12.8 Ubuntu 22.04 NVIDIA 570 image family.
- Corrected Parallelstore capacity and throughput guidance to use documented `capacity-gib` limits and published 1.15 GiB/s per TiB read and 0.5 GiB/s per TiB write throughput.
- Updated Parallelstore CLI examples to use `gcloud beta parallelstore`, valid `capacity-gib`, and documented file and directory striping flags.
- Fixed Cloud Storage transfer commands from non-existent `import` / `export` forms and flags to documented `import-data` / `export-data` commands with `--source-gcs-bucket-uri`, `--destination-parallelstore-path`, `--source-parallelstore-path`, and `--destination-gcs-bucket-uri`.
- Added the required Cloud Storage IAM binding for the Parallelstore service agent before import/export.
- Corrected DAOS client installation and startup instructions for Ubuntu 22.04, including the Parallelstore apt repository, `daos-client` package, `daos_agent` startup, `include_fabric_ifaces`, open-file limit, and DFuse mount flags.
- Updated the DFuse mount example to include documented `--disable-wb-cache`, `--thread-count`, `--eq-count`, and `--multi-user` options.
- Changed libioil usage from a shell-wide export to per-command `LD_PRELOAD`, matching Google Cloud guidance.
- Replaced the misleading `iostat` guidance with Cloud Monitoring metric discovery and the documented Parallelstore metric names.

## Review Notes
The tutorial is technically relevant and now aligns with current Google Cloud documentation. A production A3 cluster may still need additional networking setup for maximum multi-node GPUDirect performance, but that is outside the narrow Parallelstore-focused scope of this post.
