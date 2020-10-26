import {
    Node,
    SourceFile,
    TransformerFactory,
    visitEachChild,
    VisitResult,
    // @ts-ignore internal api
    isImportCall,
    CallExpression,
} from 'typescript'

export default function (): TransformerFactory<SourceFile> {
    return (context) => {
        return (sourceFile) => {
            const { factory } = context

            function createCommonJSDynamicImport(node: CallExpression) {
                // Promise.resolve(require('xxxxx'))
                return factory.createCallExpression(
                    factory.createPropertyAccessExpression(
                        factory.createIdentifier('Promise'),
                        factory.createIdentifier('resolve')
                    ),
                    node.typeArguments,
                    [factory.createCallExpression(factory.createIdentifier('require'), undefined, node.arguments)]
                )
            }

            function visit<T extends Node>(node: T): VisitResult<Node> {
                if (isImportCall(node)) {
                    return createCommonJSDynamicImport((node as unknown) as CallExpression)
                }
                return visitEachChild(node, visit, context)
            }
            return visitEachChild(sourceFile, visit, context)
        }
    }
}
