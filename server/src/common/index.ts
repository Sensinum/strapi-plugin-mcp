import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types';
import { ZodRawShape } from 'zod';

import { Strapi } from '@local-types/strapi';

/**
 * Defines the structure for an MCP (Model Context Protocol) tool definition.
 *
 * This interface provides a standardized way to define tools that can be registered
 * with an MCP server, including their callbacks, validation schemas, and metadata.
 *
 * @template Args - The Zod schema shape for validating tool arguments
 */
export interface McpToolDefinition<Args extends ZodRawShape = ZodRawShape> {
  /** The unique name identifier for the tool */
  name: string;
  /**
   * The callback function that executes when the tool is invoked.
   * Typed loosely to avoid SDK/Zod conditional-type instantiation depth issues
   * and overly strict CallToolResult literal narrowing from SDK >=1.32.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callback: (...args: any[]) => any;
  /** Optional Zod schema for validating tool arguments */
  argsSchema?: Args;
  /** Optional human-readable description of what the tool does */
  description?: string;
  /** Optional annotations for additional tool metadata */
  annotations?: ToolAnnotations;
}

/**
 * Factory function type for creating MCP tool definitions.
 *
 * This type represents a function that takes a Strapi instance and returns
 * a complete tool definition. It's used for dependency injection, allowing
 * tools to access Strapi services and configuration.
 *
 * @template Args - The Zod schema shape for validating tool arguments
 * @param strapi - The Strapi instance for accessing services and data
 * @returns A complete MCP tool definition
 *
 * @example
 * ```typescript
 * const getExampleTool: McpToolDefinitionBuilder<{name: z.string()}> = (strapi) => ({
 *   name: 'example-tool',
 *   description: 'An example tool',
 *   argsSchema: { name: z.string() },
 *   callback: async (args) => {
 *     // Tool implementation using strapi
 *     return { content: [{ type: 'text', text: `Hello ${args.name}` }] };
 *   }
 * });
 * ```
 */
export type McpToolDefinitionBuilder<Args extends ZodRawShape = ZodRawShape> = (
  strapi: Strapi
) => McpToolDefinition<Args>;

/**
 * Input parameters for registering a tool with an MCP server.
 *
 * @template Args - The Zod schema shape for validating tool arguments
 */
interface ApplyToolInput<Args extends ZodRawShape = ZodRawShape> {
  /** The MCP server instance to register the tool with */
  server: McpServer;
  /** The tool definition to register */
  tool: McpToolDefinition<Args>;
}

/**
 * Registers an MCP tool with a server, handling various parameter combinations.
 *
 * This function intelligently registers tools with the MCP server based on which
 * optional parameters are provided. It handles all valid combinations of argsSchema,
 * description, and annotations to ensure proper tool registration.
 *
 * The function will call the appropriate server.tool() overload based on:
 * - All parameters present: name, description, argsSchema, annotations, callback
 * - Description + argsSchema: name, description, argsSchema, callback
 * - Annotations + argsSchema: name, argsSchema, annotations, callback
 * - Only argsSchema: name, argsSchema, callback
 * - Only callback: name, callback
 *
 * @template Args - The Zod schema shape for validating tool arguments
 * @param params - Object containing the server and tool definition
 *
 * @example
 * ```typescript
 * const server = new McpServer({ name: 'my-server', version: '1.0.0' });
 * const tool: McpToolDefinition<{input: z.string()}> = {
 *   name: 'echo',
 *   description: 'Echoes the input',
 *   argsSchema: { input: z.string() },
 *   callback: async (args) => ({
 *     content: [{ type: 'text', text: args.input }]
 *   })
 * };
 *
 * registerTool({ server, tool });
 * ```
 */
export const registerTool = <Args extends ZodRawShape>({ server, tool }: ApplyToolInput<Args>) => {
  const { name, callback, argsSchema, description, annotations } = tool;

  // Cast through `any` — SDK 1.32 tool() generics (Zod v3/v4 compat) otherwise hit
  // "Type instantiation is excessively deep" with our ZodRawShape tool defs.
  const register = server.tool.bind(server) as (...args: any[]) => unknown;

  if (argsSchema && description && annotations) {
    register(name, description, argsSchema, annotations, callback);
  } else if (argsSchema && description) {
    register(name, description, argsSchema, callback);
  } else if (argsSchema && annotations) {
    register(name, argsSchema, annotations, callback);
  } else if (argsSchema) {
    register(name, argsSchema, callback);
  } else {
    register(name, callback);
  }
};
