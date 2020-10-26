import {
    isStringLiteral,
    Node,
    SourceFile,
    SyntaxKind,
    TransformerFactory,
    visitEachChild,
    VisitResult,
} from 'typescript'

export default function (): TransformerFactory<SourceFile> {
    return (context) => {
        const { factory } = context
        return (sourceFile) => {
            function visit<T extends Node>(node: T): VisitResult<Node> {
                // console.log(SyntaxKind[node.kind])
                if (isStringLiteral(node)) {
                    // console.log(node.text)
                    return factory.createStringLiteral('Hello World!', true)
                }

                return visitEachChild(node, visit, context)
            }
            return visitEachChild(sourceFile, visit, context)
        }
    }
}
