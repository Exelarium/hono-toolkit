import { Context, Env, MiddlewareHandler, Next } from 'hono'
import { createRemoteJWKSet, jwtVerify } from 'jose'

export async function withAuthentication(
  context: Context<Env>,
  next: Next,
): Promise<void | Response> {
  const audience = context.env.OAUTH_AUDIENCE
  const authority = context.env.OAUTH_AUTHORITY

  if (!audience) {
    throw new Error(
      'OAuth2 audience is not defined. Please ensure an OAUTH_AUDIENCE is defined in your environment variables or its value passed in the configuration',
    )
  }
  if (!authority) {
    throw new Error(
      'OAuth2 authority is not defined. Please ensure an OAUTH_AUTHORITY is defined in your environment variables or its value passed in the configuration',
    )
  }
  const authorization = context.req.header('Authorization')

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return context.json({ message: 'Unauthorized' }, 401)
  }
  const token = authorization.replace('Bearer ', '')

  const jwks = createRemoteJWKSet(new URL(`${authority}.well-known/jwks.json`))

  try {
    const { payload } = await jwtVerify(token, jwks, { audience, issuer: authority })
    context.set('jwt', payload)
    await next()
  } catch {
    return context.json({ message: 'Invalid token' }, 403)
  }
}
