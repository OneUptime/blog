# Validation Summary: How to Deploy a Python Application with Epinio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Epinio
- Kubernetes
- Python
- Flask
- Paketo Buildpacks
- Procfile

## Sources Consulted
- Epinio `epinio push` command reference: https://docs.epinio.io/references/commands/cli/epinio_push
- Epinio `epinio target` command reference: https://docs.epinio.io/references/commands/cli/epinio_target
- Epinio `epinio app list` command reference: https://docs.epinio.io/references/commands/cli/app/epinio_app_list
- Epinio `epinio app show` command reference: https://docs.epinio.io/references/commands/cli/app/epinio_app_show
- Epinio `epinio app delete` command reference: https://docs.epinio.io/references/commands/cli/app/epinio_app_delete
- Epinio `epinio app env set` command reference: https://docs.epinio.io/references/commands/cli/app/env/epinio_app_env_set
- Epinio `epinio app env list` command reference: https://docs.epinio.io/references/commands/cli/app/env/epinio_app_env_list
- Epinio single-developer tutorial: https://docs.epinio.io/tutorials/single-dev-workflow
- Epinio supported applications: https://docs.epinio.io/references/supported_applications
- Epinio custom routes: https://docs.epinio.io/1.5.1/howtos/custom_routes
- Paketo Python Buildpack Reference: https://paketo.io/docs/reference/python-reference/
- Paketo Builders Reference: https://paketo.io/docs/reference/builders-reference/
- Flask installation: https://flask.palletsprojects.com/en/stable/installation/
- Flask quickstart: https://flask.palletsprojects.com/en/stable/quickstart/
- Flask production deployment guidance for Waitress and Gunicorn: https://flask.palletsprojects.com/en/stable/deploying/waitress/ and https://flask.palletsprojects.com/en/stable/deploying/gunicorn/

## Issues Found
- The post was titled as a Python and Flask deployment guide, but the main example used a Bash `nc` loop and a separate Node.js example. I replaced those with a real Flask `app.py` example so the article matches its title and tags.
- The original example did not include `requirements.txt`, which Epinio's Paketo-based Python build flow relies on to detect and install Python dependencies. I added `requirements.txt` with `Flask`.
- The original example also omitted a `Procfile`. According to the Paketo Python buildpack reference, the default Python start command is `python`, which would not start the web app correctly. I added `Procfile` with `web: python app.py`.
- The route extraction commands used `grep Routes | awk '{print $2}'`, but `epinio app show` prints `Routes:` on one line and the actual URL on the following line. I changed the commands to `awk '/Routes:/{getline; print $2}'` so they return the first route correctly.
- The browser-opening example used `open`, which is macOS-specific. I replaced it with `python3 -m webbrowser "$APP_URL"` to keep the example usable in a broader Unix-like shell environment.

## Review Notes
- The `--route my-app.epinio.example.com` example is valid as a custom route example, but it assumes that the domain resolves to the cluster ingress as described in Epinio's custom route documentation.
- The Flask sample now works as a minimal deployment example. For higher-traffic production workloads, a dedicated WSGI server such as Gunicorn or Waitress would be a stronger default than Flask's builtin server.
