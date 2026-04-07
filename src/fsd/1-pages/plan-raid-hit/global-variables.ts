export interface VariableDescriptor {
    id: string;
    label: string;
    type: 'boolean' | 'number' | 'string' | 'charId[]';
}

export class GlobalVariables {}
