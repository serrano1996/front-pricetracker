# FrontPricetracker

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.2.3.

## Project structure

Code is grouped by feature (what the app does), and each feature by layer:

```
src/app/
├── core/                 App-wide services, one instance each
│   ├── api/              Backend client (price-tracker-api.ts) and its contracts (models.ts)
│   ├── i18n/             English/Spanish texts, money and date formatting
│   ├── theme/            Light/dark theme
│   └── storage/          localStorage that never throws
├── shared/               Used by several features
│   ├── domain/           Pure rules (pack size)
│   └── ui/               Icon and logo components
└── features/
    ├── search/           Search page: finder, comparison, results by store
    ├── product/          Product page: price summary, chart, history
    └── basket/           Shopping list and where to buy it
```

Inside a feature:

| Folder         | Holds                                                     | May import                      |
| -------------- | --------------------------------------------------------- | ------------------------------- |
| `domain/`      | Pure functions and types: the business rules, no Angular  | `core/api/models` types only    |
| `data/`        | Data sources other than the backend API (e.g. places)     | Angular, `core`                 |
| `application/` | State services (e.g. the shopping list store)             | `domain`, `core`                |
| `ui/`          | Pages and components                                      | everything above, other features' `application/` |

`core` never imports from `shared` or `features`, and `shared` never imports from `features`. Each `domain/` file has its own unit tests next to it; component tests sit next to their component in `ui/`.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
