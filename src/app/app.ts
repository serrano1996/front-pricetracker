import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { I18n, Lang } from './core/i18n/i18n';
import { Theme } from './core/theme/theme';
import { Basket } from './features/basket/application/basket.store';
import { Icon } from './shared/ui/icon';
import { Logo } from './shared/ui/logo';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, Logo],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  readonly basket = inject(Basket);
  readonly i18n = inject(I18n);
  readonly theme = inject(Theme);
  readonly languages: Lang[] = ['en', 'es'];
}
