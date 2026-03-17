import { TestStatus } from '@/runner/state';

export interface StatusStyle {
    char: string;
    color: string; // Ink color prop value
}

export function testStatus(status: TestStatus): StatusStyle {
    switch (status) {
        case 'passed': return { char: '✓', color: 'green' };
        case 'failed': return { char: '✕', color: 'red' };
        case 'cancelled': return { char: '⊘', color: 'gray' };
        case 'running': return { char: '', color: 'blueBright' }; // spinner handled by component
        case 'pending': return { char: '◌', color: 'gray' };
    }
}

export function stepStatus(status: TestStatus): StatusStyle {
    switch (status) {
        case 'running': return { char: '>', color: 'gray' };
        case 'passed': return { char: '⚑', color: 'blueBright' };
        case 'failed': return { char: '✕', color: 'red' };
        case 'cancelled': return { char: '⊘', color: 'gray' };
        case 'pending': return { char: '•', color: 'gray' };
    }
}

export function checkStatus(status: TestStatus): StatusStyle {
    switch (status) {
        case 'running': return { char: '?', color: 'gray' };
        case 'passed': return { char: '✓', color: 'blueBright' };
        case 'failed': return { char: '✕', color: 'red' };
        case 'cancelled': return { char: '⊘', color: 'gray' };
        case 'pending': return { char: '•', color: 'gray' };
    }
}
