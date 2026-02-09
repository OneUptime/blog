# How to Run RStudio Server in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, RStudio, R, Data Science, Docker Compose, Statistics, IDE

Description: Practical guide to running RStudio Server in Docker for reproducible R development environments

---

RStudio Server provides a browser-based IDE for the R programming language. It gives you the full RStudio experience without installing anything locally. Running it in Docker takes this a step further. You get reproducible environments, easy version management, and the ability to run multiple R environments with different package versions side by side. This is particularly valuable for data science teams where "works on my machine" problems with R packages are common.

This guide covers setting up RStudio Server in Docker, managing R packages, persisting data, and configuring the environment for team use.

## Quick Start

The Rocker project maintains the official RStudio Docker images. Get started with a single command:

```bash
# Start RStudio Server on port 8787 with a default password
docker run -d \
  --name rstudio \
  -p 8787:8787 \
  -e PASSWORD=yourpassword \
  rocker/rstudio:4.4.1
```

Open http://localhost:8787 in your browser. Log in with username `rstudio` and the password you set. You will see the full RStudio IDE running in your browser.

## Choosing the Right Image

The Rocker project offers several image variants:

| Image | Description | Size |
|-------|------------|------|
| `rocker/rstudio` | Base RStudio Server | ~800 MB |
| `rocker/tidyverse` | Includes tidyverse packages | ~1.5 GB |
| `rocker/verse` | tidyverse + LaTeX for PDF generation | ~3 GB |
| `rocker/geospatial` | verse + geospatial libraries | ~4 GB |
| `rocker/ml` | Machine learning libraries | ~5 GB |

For most data analysis work, `rocker/tidyverse` saves you from waiting for dplyr, ggplot2, and friends to compile:

```bash
# Start RStudio with tidyverse pre-installed
docker run -d \
  --name rstudio-tidy \
  -p 8787:8787 \
  -e PASSWORD=yourpassword \
  rocker/tidyverse:4.4.1
```

## Persisting Your Work

Without volumes, everything inside the container disappears when it stops. Mount your project directory and a library cache to persist both your code and installed packages:

```bash
# Run with persistent data and package library
docker run -d \
  --name rstudio \
  -p 8787:8787 \
  -e PASSWORD=yourpassword \
  -v $(pwd)/projects:/home/rstudio/projects \
  -v rstudio-libs:/usr/local/lib/R/site-library \
  rocker/tidyverse:4.4.1
```

The first volume mount makes your local `projects` directory available inside the container. The second uses a named Docker volume to cache installed R packages, so they survive container restarts.

## Docker Compose for a Full Setup

For a more complete environment with a database for data analysis:

```yaml
# docker-compose.yml - RStudio with PostgreSQL for data analysis
version: "3.8"

services:
  rstudio:
    image: rocker/tidyverse:4.4.1
    container_name: rstudio-server
    ports:
      - "8787:8787"
    environment:
      - PASSWORD=securepassword
      - ROOT=true
      - TZ=America/New_York
    volumes:
      # Mount project files
      - ./projects:/home/rstudio/projects
      # Persist installed R packages
      - r-libs:/usr/local/lib/R/site-library
      # Mount shared datasets
      - ./data:/home/rstudio/data
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:16
    container_name: rstudio-db
    environment:
      POSTGRES_USER: analyst
      POSTGRES_PASSWORD: dbpassword
      POSTGRES_DB: analytics
    volumes:
      - pg-data:/var/lib/postgresql/data
      # Load seed data on first run
      - ./sql/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    restart: unless-stopped

volumes:
  r-libs:
  pg-data:
```

Start the environment:

```bash
# Launch RStudio and PostgreSQL together
docker compose up -d
```

Now from within RStudio, you can connect to PostgreSQL directly:

```r
# connect_db.R - connect to the PostgreSQL database from RStudio
library(DBI)
library(RPostgres)

# Connect to PostgreSQL running alongside RStudio in Docker
con <- dbConnect(
  RPostgres::Postgres(),
  host = "postgres",
  port = 5432,
  dbname = "analytics",
  user = "analyst",
  password = "dbpassword"
)

# Query data directly into a data frame
df <- dbGetQuery(con, "SELECT * FROM sales WHERE date >= '2025-01-01'")
head(df)

dbDisconnect(con)
```

## Custom Image with Pre-installed Packages

If your team uses specific packages, build a custom image so everyone starts with the same environment:

```dockerfile
# Dockerfile - RStudio with team-specific R packages
FROM rocker/tidyverse:4.4.1

# Install system libraries required by some R packages
RUN apt-get update && apt-get install -y \
    libgdal-dev \
    libgeos-dev \
    libproj-dev \
    libxml2-dev \
    libfontconfig1-dev \
    && rm -rf /var/lib/apt/lists/*

# Install R packages from CRAN
RUN R -e "install.packages(c( \
    'DBI', \
    'RPostgres', \
    'data.table', \
    'xgboost', \
    'caret', \
    'plotly', \
    'shiny', \
    'rmarkdown', \
    'forecast', \
    'zoo' \
), repos='https://cran.r-project.org')"

# Install packages from GitHub
RUN R -e "remotes::install_github('rstudio/gt')"
```

Build it:

```bash
# Build the custom RStudio image
docker build -t rstudio-team:latest .
```

## Multi-User Configuration

RStudio Server supports multiple users. Create additional users at container startup:

```bash
# Run RStudio with multiple user accounts
docker run -d \
  --name rstudio-multi \
  -p 8787:8787 \
  -e PASSWORD=adminpass \
  -e ROOT=true \
  rocker/tidyverse:4.4.1

# Add additional users
docker exec rstudio-multi useradd -m -s /bin/bash analyst1
docker exec rstudio-multi bash -c "echo 'analyst1:password1' | chpasswd"

docker exec rstudio-multi useradd -m -s /bin/bash analyst2
docker exec rstudio-multi bash -c "echo 'analyst2:password2' | chpasswd"
```

Each user gets their own home directory and R session.

## Resource Limits

For shared environments, limit resources per container to prevent one user from consuming everything:

```bash
# Restrict CPU and memory for the RStudio container
docker run -d \
  --name rstudio-limited \
  -p 8787:8787 \
  --cpus 4 \
  --memory 8g \
  -e PASSWORD=yourpassword \
  rocker/tidyverse:4.4.1
```

## Running R Scripts in Batch Mode

You can also use the same image for batch R script execution without the IDE:

```bash
# Execute an R script in batch mode
docker run --rm \
  -v $(pwd):/home/rstudio/project \
  -w /home/rstudio/project \
  rocker/tidyverse:4.4.1 \
  Rscript analysis.R
```

This is useful for CI/CD pipelines and scheduled reports.

## Generating Reports with R Markdown

RStudio in Docker handles R Markdown rendering well. Use the `rocker/verse` image for LaTeX support:

```bash
# Render an R Markdown document to PDF
docker run --rm \
  -v $(pwd):/home/rstudio/project \
  -w /home/rstudio/project \
  rocker/verse:4.4.1 \
  Rscript -e "rmarkdown::render('report.Rmd', output_format='pdf_document')"
```

## Shiny Apps Alongside RStudio

If you develop Shiny apps, expose an additional port:

```bash
# RStudio with Shiny server port exposed
docker run -d \
  --name rstudio-shiny \
  -p 8787:8787 \
  -p 3838:3838 \
  -e PASSWORD=yourpassword \
  -e ADD=shiny \
  rocker/tidyverse:4.4.1
```

The `-e ADD=shiny` flag installs and starts Shiny Server alongside RStudio. Access Shiny apps at http://localhost:3838.

## Conclusion

RStudio Server in Docker eliminates the biggest headache in R development, which is environment consistency. Every team member works with identical R versions, system libraries, and package versions. The Rocker images provide solid foundations, and custom Dockerfiles let you lock down your exact package set. For teams doing collaborative data analysis, combining RStudio with a database in Docker Compose creates a self-contained analytics environment that anyone can spin up in minutes.
