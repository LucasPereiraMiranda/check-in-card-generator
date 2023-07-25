import { APIGatewayProxyHandler } from 'aws-lambda';
import { document } from '../../utils/dynamo-db-client';
import { compile } from 'handlebars';
import { join } from 'path';
import { readFileSync } from 'fs';
import { format, parseISO } from 'date-fns';
import chromium from 'chrome-aws-lambda';
import { uuid } from 'uuidv4';

import {
  ICreateCheckInCardRequest,
  ICreateCheckInCardResponse,
} from './interfaces/create-check-in-card-request.interface';
import { validateRequestProps } from './validations';

const saveCheckInCard = async (cardData: ICreateCheckInCardRequest) => {
  const cardUuid = uuid();
  await document
    .put({
      TableName: 'user_card',
      Item: {
        id: cardUuid,
        ...cardData,
        createdAt: new Date().toISOString(),
      },
    })
    .promise();
  return cardUuid;
};

const fetchCheckInCard = async (cardUuid: string) => {
  const response = await document
    .query({
      TableName: 'user_card',
      KeyConditionExpression: 'id = :id',
      ExpressionAttributeValues: {
        ':id': cardUuid,
      },
    })
    .promise();
  return response.Items[0];
};

const generatePdf = async (content: string) => {
  const browser = await chromium.puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
    channel: 'chrome',
  });

  const page = await browser.newPage();
  await page.setContent(content);

  const pdf = await page.pdf({
    format: 'a4',
    landscape: true,
    printBackground: true,
    preferCSSPageSize: true,
    path: process.env.IS_OFFLINE ? './check-in-card.pdf' : null,
  });

  await browser.close();
  return pdf;
};

const compileTemplate = async (
  data: ICreateCheckInCardRequest,
  templatePath: string
) => {
  const html = readFileSync(templatePath, 'utf-8');

  return compile(html)(data);
};

export const handler: APIGatewayProxyHandler = async (event) => {
  const validated = await validateRequestProps(JSON.parse(event.body));

  if (validated.hasInputError) {
    return validated.content;
  }

  const { userName, userAvatarUrl, courseCardName, classUrl } = JSON.parse(
    event.body
  ) as ICreateCheckInCardRequest;

  const cardUuid = await saveCheckInCard({
    userName,
    userAvatarUrl,
    courseCardName,
    classUrl,
  });
  const uniqueCheckInCard = await fetchCheckInCard(cardUuid);

  const formattedData = {
    id: uniqueCheckInCard.id,
    createdAt: format(parseISO(uniqueCheckInCard.createdAt), 'dd/MM/yyyy'),
    userName: uniqueCheckInCard.userName,
    userAvatarUrl: uniqueCheckInCard.userAvatarUrl,
    courseCardName: uniqueCheckInCard.courseCardName,
    classUrl: uniqueCheckInCard.classUrl,
  };

  const templatePath = join(
    process.cwd(),
    'src',
    'functions',
    'check-in-card-generator',
    'templates',
    'check-in-cards.hbs'
  );

  const content = await compileTemplate(formattedData, templatePath);
  await generatePdf(content);

  return {
    statusCode: 201,
    body: JSON.stringify({
      id: uniqueCheckInCard.id,
    } as ICreateCheckInCardResponse),
  };
};
