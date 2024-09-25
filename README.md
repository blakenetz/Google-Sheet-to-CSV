# Google Sheet To CSV

Use Google service accounts to download a Google Sheet locally as a csv

## Getting started

### Install the Library

```cli
npm i google-sheet-to-csv
```

### Google Cloud Setup

1. Create a [new project](https://developers.google.com/workspace/guides/create-project#google-cloud-console)
   - Save the project id
2. Create a [service account](https://cloud.google.com/iam/docs/service-accounts-create#creating)
   - Set the role as `viewer`
   - Save the unique id
3. Create [credentials](https://developers.google.com/workspace/guides/create-credentials#create_credentials_for_a_service_account) for service account
4. [Share](https://support.google.com/drive/answer/2494822?hl=en#) google sheet with service account
   - Service account email will resemble something along the lines of `[projectName]@[projectId].iam.gserviceaccount.com`
   - Set the role as `viewer`

### Authorization

There are 2 authorization strategies: credentials.json or ENV variables.

#### Credentials.json

Move the JSON file to the `[rootDir]/tokens` directory. If storing in a different location, update the `keyFile` option.

#### ENV variables

There are 4 required env variables:

`GOOGLE_PROJECT_ID`: Defined when [creating a project](#google-cloud-setup)
`GOOGLE_CLIENT_ID`: Unique id of service account
`GOOGLE_PRIVATE_KEY_ID`: Included in [credentials.json](#credentialsjson)
`GOOGLE_PRIVATE_KEY`: Included in [credentials.json](#credentialsjson)

And one optional env variable:

`GOOGLE_PROJECT_NAME`: Defined when [creating a project](#google-cloud-setup)

If this is not included, it's extracted from the project id.

## Params

| name       | description                                                                                                                            | type    | required | default value                       |
| :--------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------- | -------- | ----------------------------------- |
| fileId     | id of the Google sheet                                                                                                                 | string  | true     | n/a                                 |
| keyFile    | Filepath of the JSON file for service account credentials. Relative to root directory. If JSON file doesn't exist, it will be created. | string  | false    | "[rootDir]/tokens/credentials.json" |
| outputFile | Filepath of the outputted CSV file. Relative to root directory                                                                         | string  | false    | "[rootDir]/assets/output.csv"       |
| verbose    | Whether to display logs or not                                                                                                         | boolean | false    | false                               |
