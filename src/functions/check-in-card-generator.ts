import { APIGatewayProxyHandler } from "aws-lambda";
import { document } from "../utils/dynamo-db-client";

interface ICreateCheckInCardRequest {
  id: string;
  userName: string;
  courseCardName: string;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const { id, userName, courseCardName } = JSON.parse(
    event.body
  ) as ICreateCheckInCardRequest;

  await document
    .put({
      TableName: "user_card",
      Item: {
        id,
        userName,
        courseCardName,
        createdAt: new Date().toISOString(),
      },
    })
    .promise();

  const response = await document
    .query({
      TableName: "user_card",
      KeyConditionExpression: "id = :id",
      ExpressionAttributeValues: {
        ":id": id,
      },
    })
    .promise();

  return {
    statusCode: 201,
    body: JSON.stringify(response.Items[0]),
  };
};
