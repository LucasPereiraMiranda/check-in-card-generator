import * as yup from 'yup';
import { ICreateCheckInCardRequest } from './interfaces/create-check-in-card-request.interface';

export const validateRequestProps = async (
  requestProps: ICreateCheckInCardRequest
) => {
  const schema = yup.object().shape({
    userName: yup.string().required(),
    userAvatarUrl: yup.string().url().required(),
    courseCardName: yup.string().required(),
    classUrl: yup.string().url().required(),
  });

  try {
    await schema.validate(requestProps, {
      abortEarly: false,
    });
    return {
      hasInputError: false,
    };
  } catch (error) {
    return {
      hasInputError: true,
      content: {
        statusCode: 400,
        body: JSON.stringify({
          message: 'Invalid input.',
          errors: error.errors,
        }),
      },
    };
  }
};
