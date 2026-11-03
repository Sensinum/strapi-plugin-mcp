import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { describe, expect, it, vi } from 'vitest';
import { z, ZodRawShape } from 'zod';

import { McpToolDefinition, registerTool } from '.';

// Minimal shape to satisfy the call in tests
interface FakeMcpServer {
  tool: (...args: any[]) => void;
}

describe('applyTool', () => {
  it('registers tool with only callback', () => {
    // Given
    const toolSpy = vi.fn();
    const server: FakeMcpServer = { tool: toolSpy };
    const tool: McpToolDefinition<any> = {
      name: 'only-callback',
      callback: vi.fn(),
    };

    // When
    registerTool({ server: server as unknown as McpServer, tool });

    // Then
    expect(toolSpy).toHaveBeenCalledWith('only-callback', expect.any(Function));
  });

  it('registers tool with argsSchema', () => {
    // Given
    const toolSpy = vi.fn();
    const server: FakeMcpServer = { tool: toolSpy };
    const tool: McpToolDefinition<ZodRawShape> = {
      name: 'with-args',
      callback: vi.fn(),
      argsSchema: {},
    };

    // When
    registerTool({ server: server as unknown as McpServer, tool });

    // Then
    expect(toolSpy).toHaveBeenCalledWith('with-args', expect.any(Object), expect.any(Function));
  });

  it('registers tool with description and argsSchema', () => {
    // Given
    const toolSpy = vi.fn();
    const server: FakeMcpServer = { tool: toolSpy };
    const tool: McpToolDefinition<ZodRawShape> = {
      name: 'with-desc-args',
      callback: vi.fn(),
      argsSchema: {},
      description: 'desc',
    };

    // When
    registerTool({ server: server as unknown as McpServer, tool });

    // Then
    expect(toolSpy).toHaveBeenCalledWith(
      'with-desc-args',
      'desc',
      expect.any(Object),
      expect.any(Function)
    );
  });

  it('registers tool with argsSchema and annotations (no description)', () => {
    // Given
    const toolSpy = vi.fn();
    const server: FakeMcpServer = { tool: toolSpy };
    const tool: McpToolDefinition<ZodRawShape> = {
      name: 'with-args-annotations',
      callback: vi.fn(),
      argsSchema: {},
      annotations: {},
    };

    // When
    registerTool({ server: server as unknown as McpServer, tool });

    // Then
    expect(toolSpy).toHaveBeenCalledWith(
      'with-args-annotations',
      expect.any(Object),
      expect.any(Object),
      expect.any(Function)
    );
  });

  it('registers tool with description, argsSchema, and annotations', () => {
    // Given
    const toolSpy = vi.fn();
    const server: FakeMcpServer = { tool: toolSpy };
    const tool: McpToolDefinition<ZodRawShape> = {
      name: 'with-all',
      callback: vi.fn(),
      argsSchema: {},
      description: 'desc',
      annotations: {},
    };

    // When
    registerTool({ server: server as unknown as McpServer, tool });

    // Then
    expect(toolSpy).toHaveBeenCalledWith(
      'with-all',
      'desc',
      expect.any(Object),
      expect.any(Object),
      expect.any(Function)
    );
  });

  it('registers no-arg tools with a real McpServer when argsSchema is a raw empty shape', () => {
    // Given — regression for #17 / #22 (SDK ≥1.28 rejects z.object({}))
    const server = new McpServer({ name: 'test', version: '1.0.0' });
    const tool: McpToolDefinition<ZodRawShape> = {
      name: 'get-content-types',
      description: 'Get all content types',
      argsSchema: {},
      callback: async () => ({ content: [{ type: 'text', text: 'ok' }] }),
    };

    // When / Then
    expect(() => registerTool({ server, tool })).not.toThrow();
  });

  it('rejects z.object({}) as argsSchema against a real McpServer', () => {
    // Given — documents the SDK failure mode fixed in #17
    const server = new McpServer({ name: 'test', version: '1.0.0' });
    const tool = {
      name: 'get-content-types',
      description: 'Get all content types',
      argsSchema: z.object({}),
      callback: async () => ({ content: [{ type: 'text', text: 'ok' }] }),
    } as unknown as McpToolDefinition<ZodRawShape>;

    // When / Then
    expect(() => registerTool({ server, tool })).toThrow(
      /expected a Zod schema or ToolAnnotations/
    );
  });
});
