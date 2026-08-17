# arb

请完整读取我上传的三个附件，然后立即实现一个可运行的全栈套利策略实时行情网页，无需先输出设计方案。

三个附件的职责如下：

1. lovable-strategy-dashboard-plan.md

   这是最终产品规格、全栈架构、行情规则、UC代理规则和验收标准。

2. strategy-dashboard-prototype.html

   这是页面视觉、交互方式以及全部48条策略配置、腿信息、公式和精度的事实源。

3. sina-futures-api-reference.html

   这是新浪财经接口地址、代码映射、返回字段、可用性和CORS限制的事实源。

最终页面必须满足：

- 共48条策略；

- 进口套利8条；

- LME vs BC 4条；

- 内盘正套36条；

- 分组仅包含“全部、进口套利、LME vs BC、内盘正套”；

- Footer只显示最后更新时间；

- UC合约保留类似 UC2609-SGX 的原始名称，但价格使用新浪 USD/CNY 现货代理，并明确显示 PROXY/现货代理；

- 浏览器不直接访问新浪，所有新浪行情由服务端 quotes Edge Function 获取、解析和标准化；

- 行情失败时显示 DOWN 和“—”，不生成随机模拟价格；

- 页面布局、颜色、表格结构和交互遵循 prototype；

- 只实现计划文档明确要求的功能。

请先完整解析附件中的 STRATEGIES 和 CONTRACT_MAP，再开始编码。完成前运行类型检查、构建和测试，并报告 Edge Function 路径、测试结果以及实际返回空数据的合约。

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://basemetals-spread-go.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f0042698-278c-436f-b2b2-7982a22e5906).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
