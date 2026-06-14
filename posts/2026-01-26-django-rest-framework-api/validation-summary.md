# Validation Summary: How to Build REST APIs with Django REST Framework

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Django
- Django REST Framework
- django-filter
- DRF token authentication
- DRF serializers, viewsets, routers, permissions, pagination, filtering, testing, and exception handling
- drf-spectacular

## Sources Consulted
- Django REST Framework authentication documentation: https://www.django-rest-framework.org/api-guide/authentication/
- Django REST Framework filtering documentation: https://www.django-rest-framework.org/api-guide/filtering/
- Django REST Framework permissions documentation: https://www.django-rest-framework.org/api-guide/permissions/
- Django REST Framework routers documentation: https://www.django-rest-framework.org/api-guide/routers/
- Django REST Framework serializers documentation: https://www.django-rest-framework.org/api-guide/serializers/
- Django REST Framework serializer relations documentation: https://www.django-rest-framework.org/api-guide/relations/
- Django REST Framework pagination documentation: https://www.django-rest-framework.org/api-guide/pagination/
- Django REST Framework testing documentation: https://www.django-rest-framework.org/api-guide/testing/
- Django REST Framework exceptions documentation: https://www.django-rest-framework.org/api-guide/exceptions/
- django-filter DRF integration documentation: https://django-filter.readthedocs.io/en/latest/guide/rest_framework.html
- Django migrations documentation: https://docs.djangoproject.com/en/6.0/topics/migrations/
- Django admin and manage.py command documentation: https://docs.djangoproject.com/en/6.0/ref/django-admin/
- Django model Meta options documentation: https://docs.djangoproject.com/en/5.2/ref/models/options/
- drf-spectacular documentation: https://drf-spectacular.readthedocs.io/

## Issues Found
- The setup installed only `django` and `djangorestframework`, but later code imported and used `django_filters.rest_framework.DjangoFilterBackend`. Updated the initial install command to include `django-filter` and added `'django_filters'` to `INSTALLED_APPS`, matching the DRF and django-filter integration documentation.
- The initial DRF settings configured `TokenAuthentication`, and later code imported `rest_framework.authtoken`, but `rest_framework.authtoken` was not added until later. Added `'rest_framework.authtoken'` to the initial `INSTALLED_APPS` so token authentication and token tests work from the start.
- `BookViewSet` imported the custom `IsOwnerOrReadOnly` permission but did not use it, so authenticated non-owners could update books despite the owner-only permission example and tests. Added `IsOwnerOrReadOnly` to `BookViewSet.permission_classes`.
- `ReviewViewSet` exposed create behavior through `ModelViewSet`, but `ReviewSerializer` did not include a writable `book` field, so direct review creation through `/api/reviews/` could not supply the required foreign key. Added an optional `book` `PrimaryKeyRelatedField` and a `perform_create` validation check so nested `add_review` creation still works while direct review creation requires a book.
- The registration view was shown but not wired into URL patterns. Added a small `books/urls.py` snippet registering `RegisterView` at `register/`.
- The custom filter example used the base `django_filters` import rather than the DRF integration import recommended by django-filter. Updated it to `from django_filters import rest_framework as filters`.

## Review Notes
- The model example uses `unique_together`, which remains supported but Django documentation recommends `UniqueConstraint` for new code because it is more flexible and `unique_together` may be deprecated in the future.
- The snippets are intended as tutorial code, not a hardened production API. Future improvements could add password validation to registration, explicit non-owner update tests, database aggregation for average ratings, and more detailed review endpoint tests.
